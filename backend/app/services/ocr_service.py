import logging
import io
from typing import Optional

import httpx
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)


async def ocr_with_google_vision(image_bytes: bytes) -> Optional[str]:
    """Call Google Vision OCR as a fallback if API key is configured."""
    if not settings.GOOGLE_VISION_API_KEY:
        return None

    url = f"https://vision.googleapis.com/v1/images:annotate?key={settings.GOOGLE_VISION_API_KEY}"
    payload = {
        "requests": [
            {
                "image": {"content": image_bytes.decode('latin1')},
                "features": [{"type": "TEXT_DETECTION"}]
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data = res.json()
            annotations = data.get("responses", [])[0]
            text = annotations.get("fullTextAnnotation", {}).get("text")
            return text
    except Exception as e:
        logger.warning(f"Google Vision OCR failed: {e!s}")
        return None


def ocr_with_tesseract(image_bytes: bytes) -> Optional[str]:
    """Extract text using local Tesseract OCR if available."""
    try:
        from pytesseract import image_to_string
    except Exception:
        logger.info("pytesseract not installed or Tesseract not available locally")
        return None

    try:
        img = Image.open(io.BytesIO(image_bytes))
        text = image_to_string(img)
        return text
    except Exception as e:
        logger.warning(f"Tesseract OCR failed: {e!s}")
        return None


async def extract_text_from_image(image_bytes: bytes) -> str:
    """Try local Tesseract first, then Google Vision as a fallback.

    Returns empty string on failure.
    """
    text = ocr_with_tesseract(image_bytes)
    if text:
        return text

    text = await ocr_with_google_vision(image_bytes)
    return text or ""


__all__ = ["extract_text_from_image"]
