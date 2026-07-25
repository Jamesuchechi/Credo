import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def fetch_news_api_corroboration(query: str) -> list[dict[str, Any]]:
    if not settings.NEWS_API_KEY:
        logger.debug("NEWS_API_KEY not configured, skipping News API lookup")
        return []

    try:
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query[:100],
            "pageSize": 5,
            "sortBy": "relevance",
            "apiKey": settings.NEWS_API_KEY
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
                        "provider": "NewsAPI"
                    }
                    for a in articles if a.get("title")
                ]
    except Exception as e:
        logger.warning(f"News API lookup error: {e!s}")

    return []
