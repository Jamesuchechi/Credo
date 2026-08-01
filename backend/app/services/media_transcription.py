import logging
from typing import Any

import httpx

from app.core.config import settings
from app.services.safe_http_client import safe_fetch_url

logger = logging.getLogger(__name__)


def detect_multi_speaker_diarization_heuristic(text: str) -> tuple[bool, int]:
    """
    Detects multi-speaker conversation cues or silence/turn shifts in transcript.
    """
    if not text:
        return False, 1

    turn_markers = [
        "speaker 1",
        "speaker 2",
        "person a",
        "person b",
        "voice 1",
        "voice 2",
        "[speaker",
        "listen to me",
        "he said",
        "she said",
        "replied",
        "asked me",
    ]
    lower_text = text.lower()
    matches = sum(1 for kw in turn_markers if kw in lower_text)

    dialogue_lines = [
        line.strip() for line in text.splitlines() if line.strip().startswith(("-", "—", ">")) or ":" in line[:15]
    ]

    if matches >= 2 or len(dialogue_lines) >= 2:
        return True, max(2, len(dialogue_lines))
    return False, 1


def detect_language_code(text: str) -> tuple[str, str | None]:
    """
    Detects language code and returns (lang_code, language_warning).
    Supports English ("en"), Nigerian Pidgin ("pcm"), Yoruba ("yo"), Hausa ("ha"), Igbo ("ig").
    """
    if not text:
        return "en", None

    lower_text = text.lower()
    pidgin_keywords = [
        "wey",
        "abi",
        "shey",
        "una",
        "dey",
        "no be",
        "sabi",
        "complain",
        "dis girl",
        "chaii",
        "abeg",
        "o jare",
        "gbagbe",
    ]
    yoruba_keywords = ["eku", "seun", "bawo", "omo", "wa", "loran", "pelu"]
    hausa_keywords = ["sannu", "ina", "yaya", "nagode", "lafiya"]
    igbo_keywords = ["kedu", "nno", "daalu", "biko", "nna"]

    if any(kw in lower_text for kw in yoruba_keywords):
        return "yo", "Note: Transcribed in Yoruba. Speech-to-text accuracy may vary based on dialect."
    elif any(kw in lower_text for kw in hausa_keywords):
        return "ha", "Note: Transcribed in Hausa. Speech-to-text accuracy may vary based on dialect."
    elif any(kw in lower_text for kw in igbo_keywords):
        return "ig", "Note: Transcribed in Igbo. Speech-to-text accuracy may vary based on dialect."
    elif sum(1 for kw in pidgin_keywords if kw in lower_text) >= 2:
        return "pcm", "Note: Transcribed in Nigerian Pidgin English. Idiomatic terms preserved in transcript."

    return "en", None


async def transcribe_media(raw_payload: str) -> str:
    """
    Audio and video speech-to-text transcription service via Groq Whisper API.
    Transcribes audio/video media URLs or base64 streams into clean text.
    """
    if not raw_payload:
        return ""

    # If payload is plain text and not a URL or media stream, return text directly
    if not (raw_payload.startswith(("http://", "https://", "data:audio", "data:video"))):
        return raw_payload

    url = raw_payload.strip()

    # Transcribe via Groq Whisper API if GROQ_API_KEY is configured
    if settings.GROQ_API_KEY:
        try:
            logger.info(f"Downloading media binary stream for Whisper transcription: {url[:60]}")
            fetched_media = await safe_fetch_url(
                url=url,
                method="GET",
                max_size_bytes=25 * 1024 * 1024,  # Max 25MB audio size for Whisper
                timeout=15.0,
            )
            fetched_media.raise_for_status()

            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            }
            # Send raw binary audio content bytes
            files = {
                "file": ("media_input.mp3", fetched_media.content, "audio/mpeg"),
                "model": (None, "whisper-large-v3"),
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers=headers,
                    files=files,
                )
                if res.status_code == 200:
                    transcription = res.json().get("text", "")
                    logger.info(f"Whisper transcription complete ({len(transcription)} chars)")
                    return transcription
        except Exception as exc:
            logger.warning(f"Groq Whisper media transcription failed for {url[:50]}: {exc}")

    return raw_payload


async def transcribe_audio_voice_note(raw_payload: str) -> dict[str, Any]:
    """
    Processes audio voice notes: downloads binary media bytes, calls Groq Whisper API,
    detects language, runs multi-speaker diarization heuristic, and appends attribute warnings.
    """
    raw_text = await transcribe_media(raw_payload)
    if not raw_text:
        return {
            "transcript": "",
            "language_detected": "en",
            "language_warning": None,
            "multiple_voices_detected": False,
            "speakers_count": 1,
            "raw_audio_url": raw_payload if raw_payload.startswith(("http://", "https://")) else None,
        }

    is_multi_speaker, count = detect_multi_speaker_diarization_heuristic(raw_text)
    lang_code, lang_warning = detect_language_code(raw_text)

    final_transcript = raw_text
    if is_multi_speaker and "[Multiple voices detected" not in raw_text:
        final_transcript = f"[Multiple voices detected in audio recording — conversation exchange]\n\n{raw_text}"

    return {
        "transcript": final_transcript,
        "language_detected": lang_code,
        "language_warning": lang_warning,
        "multiple_voices_detected": is_multi_speaker,
        "speakers_count": count,
        "raw_audio_url": raw_payload if raw_payload.startswith(("http://", "https://")) else None,
    }
