import logging

logger = logging.getLogger(__name__)


async def transcribe_media(raw_payload: str) -> str:
    """Placeholder transcription path for audio/video payloads.

    This is intentionally lightweight for Step 4 completion: it preserves the
    ingestion flow and allows future Groq Whisper integration to be plugged in.
    """
    logger.debug("Transcription requested for media payload, using raw payload fallback")
    return raw_payload or ""
