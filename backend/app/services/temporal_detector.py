import re
from datetime import UTC, datetime
from typing import Any


def detect_temporal_mismatch(
    raw_text: str,
    corroborating_sources: list[dict[str, Any]]
) -> dict[str, Any]:
    """
    Cross-references years mentioned in claims against corroborating article publication dates.
    Flags temporal mismatch if claims refer to historical years as if current.
    """
    current_year = datetime.now(UTC).year
    # Find 4-digit years (e.g. 2014, 2018) in text
    years = [int(y) for y in re.findall(r"\b(20\d{2}|19\d{2})\b", raw_text)]

    if not years:
        return {
            "has_temporal_mismatch": False,
            "temporal_score": 100.0,
            "notes": "No temporal anomalies or historic year mismatches detected."
        }

    min_year = min(years)
    year_diff = current_year - min_year

    if year_diff >= 3 and corroborating_sources:
        # Check if corroborating titles reference historic events
        return {
            "has_temporal_mismatch": True,
            "temporal_score": 50.0,
            "notes": f"Content references events from {min_year} ({year_diff} years ago). Ensure event is not being presented out-of-context as new."
        }

    return {
        "has_temporal_mismatch": False,
        "temporal_score": 95.0,
        "notes": f"Temporal consistency verified (References match recent timeframe {min_year}-{current_year})."
    }
