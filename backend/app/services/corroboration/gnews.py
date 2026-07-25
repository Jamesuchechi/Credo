import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def fetch_gnews_corroboration(query: str) -> list[dict[str, Any]]:
    if not settings.GNEWS_API_KEY:
        logger.debug("GNEWS_API_KEY not configured, skipping GNews lookup")
        return []

    try:
        url = "https://gnews.io/api/v4/search"
        params = {
            "q": query[:100],
            "max": 5,
            "token": settings.GNEWS_API_KEY
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url, params=params)
            if res.status_code == 200:
                articles = res.json().get("articles", [])
                return [
                    {
                        "title": a.get("title"),
                        "source": a.get("source", {}).get("name"),
                        "url": a.get("url"),
                        "published_at": a.get("publishedAt"),
                        "provider": "GNews"
                    }
                    for a in articles if a.get("title")
                ]
    except Exception as e:
        logger.warning(f"GNews lookup error: {e!s}")

    return []
