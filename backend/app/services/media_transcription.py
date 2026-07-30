import logging
import httpx

from app.core.config import settings
from app.services.safe_http_client import safe_fetch_url

logger = logging.getLogger(__name__)


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
            logger.info(f"Downloading media stream for Whisper transcription: {url[:60]}")
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
            files = {
                "file": ("media_input.mp3", fetched_media.text.encode("utf-8"), "audio/mpeg"),
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
