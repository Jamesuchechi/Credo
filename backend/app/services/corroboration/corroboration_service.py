import logging
from typing import Any

from app.services.corroboration.fact_check import fetch_fact_check_corroboration
from app.services.corroboration.gnews import fetch_gnews_corroboration
from app.services.corroboration.news_api import fetch_news_api_corroboration

logger = logging.getLogger(__name__)


async def get_corroborating_sources(query: str) -> list[dict[str, Any]]:
    """
    Orchestrates multi-source corroboration lookups across Google Fact Check, News API,
    and GNews with provider fallback routing.
    """
    corroborations: list[dict[str, Any]] = []

    # 1. Fact-Check API lookup
    fact_checks = await fetch_fact_check_corroboration(query)
    corroborations.extend(fact_checks)

    # 2. Primary News API lookup
    news_results = await fetch_news_api_corroboration(query)
    corroborations.extend(news_results)

    # 3. Fallback to GNews if primary News API yields 0 results or fails
    if len(news_results) == 0:
        gnews_results = await fetch_gnews_corroboration(query)
        corroborations.extend(gnews_results)

    return corroborations
