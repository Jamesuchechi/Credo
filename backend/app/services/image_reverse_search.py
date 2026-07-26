import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def reverse_image_search(
    image_bytes: bytes | None = None,
    image_url: str | None = None,
) -> dict[str, Any]:
    """Minimal image reverse search integration.

    Uses Google Vision API's web detection feature when an API key is
    configured. Falls back to an empty result set otherwise.
    """
    if not settings.GOOGLE_VISION_API_KEY:
        logger.debug("Google Vision API key not configured; skipping reverse image search")
        return {
            "matches": [],
            "partial_matching_images": [],
            "note": "Placeholder reverse image search — no API key configured",
        }

    url = f"https://vision.googleapis.com/v1/images:annotate?key={settings.GOOGLE_VISION_API_KEY}"

    image_payload: dict[str, Any] = {}
    if image_bytes:
        image_payload["content"] = image_bytes.decode("latin1")
    elif image_url:
        image_payload["source"] = {"imageUri": image_url}
    else:
        return {"matches": [], "partial_matching_images": [], "note": "No image provided"}

    payload = {
        "requests": [
            {
                "image": image_payload,
                "features": [{"type": "WEB_DETECTION", "maxResults": 10}],
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            web = data.get("responses", [{}])[0].get("webDetection", {})
            return {
                "matches": [
                    {"url": m.get("url"), "score": m.get("score")}
                    for m in web.get("webEntities", [])
                ],
                "partial_matching_images": [
                    {"url": m.get("url"), "score": m.get("score")}
                    for m in web.get("partialMatchingImages", [])
                ],
                "note": None,
            }
    except Exception as exc:
        logger.warning("Reverse image search failed: %s", exc)
        return {
            "matches": [],
            "partial_matching_images": [],
            "note": f"Reverse image search failed: {exc}",
        }


__all__ = ["reverse_image_search"]
