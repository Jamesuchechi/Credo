import base64
import binascii
import logging
import re

import httpx

logger = logging.getLogger(__name__)

DATA_URI_RE = re.compile(r"^data:(image/[a-zA-Z0-9+.-]+);base64,(.+)$", re.IGNORECASE)
IMAGE_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
}


async def fetch_image_bytes(raw_payload: str) -> bytes | None:
    """Decode a data URI or download an image URL as raw bytes."""
    if not raw_payload:
        return None

    source = raw_payload.strip()
    data_uri_match = DATA_URI_RE.match(source)
    if data_uri_match:
        logger.debug("Decoding image from data URI payload")
        try:
            return base64.b64decode(data_uri_match.group(2), validate=True)
        except binascii.Error as exc:
            logger.warning("Invalid base64 image payload: %s", exc)
            return None

    if source.startswith(("http://", "https://")):
        logger.debug("Fetching image from URL %s", source)
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(source)
                response.raise_for_status()
                content_type = response.headers.get("Content-Type", "").split(";")[0].lower()
                if response.content and (content_type in IMAGE_CONTENT_TYPES or source.lower().endswith(tuple(".png .jpg .jpeg .webp .gif .bmp .tiff".split()))):
                    return response.content
                logger.warning("URL did not return an image content type: %s", content_type)
        except Exception as exc:
            logger.warning("Failed to fetch image from URL %s: %s", source, exc)
        return None

    logger.debug("Attempting to decode raw base64 image payload")
    try:
        return base64.b64decode(source, validate=True)
    except binascii.Error:
        logger.warning("Payload is not a valid base64 image string")
        return None


async def preprocess_image_payload(raw_payload: str) -> bytes | None:
    """Unified wrapper for image payload conversion."""
    return await fetch_image_bytes(raw_payload)
