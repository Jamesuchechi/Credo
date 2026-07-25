import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def fetch_fact_check_corroboration(query: str) -> list[dict[str, Any]]:
    if not settings.GOOGLE_FACT_CHECK_API_KEY:
        logger.debug("GOOGLE_FACT_CHECK_API_KEY not configured, skipping Google Fact Check API")
        return []

    try:
        url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        params = {
            "query": query[:100],
            "key": settings.GOOGLE_FACT_CHECK_API_KEY
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url, params=params)
            if res.status_code == 200:
                claims = res.json().get("claims", [])
                results = []
                for claim in claims:
                    claim_reviews = claim.get("claimReview", [])
                    for review in claim_reviews:
                        results.append({
                            "title": claim.get("text"),
                            "source": review.get("publisher", {}).get("name", "Fact-Checker"),
                            "url": review.get("url"),
                            "textual_rating": review.get("textualRating"),
                            "provider": "GoogleFactCheck"
                        })
                return results
    except Exception as e:
        logger.warning(f"Google Fact Check API error: {e!s}")

    return []
