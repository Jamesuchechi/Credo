import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.services.whois_service import extract_domain, get_domain_age_days

logger = logging.getLogger(__name__)


async def get_or_create_source(db: AsyncSession, domain_raw: str) -> Source:
    domain = extract_domain(domain_raw)
    stmt = select(Source).where(Source.domain == domain)
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        whois_age = get_domain_age_days(domain)
        # Compute baseline accuracy score based on domain age (older = slightly higher baseline, capped at 75)
        base_score = 50.0 + min(whois_age / 365.0 * 5.0, 25.0) if whois_age else 60.0

        source = Source(
            domain=domain,
            name=domain.capitalize(),
            historical_accuracy_score=round(base_score, 1),
            bias_rating="unrated",
            whois_age_days=whois_age,
            is_known_satire=False,
            is_known_misinfo=False
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)

    return source


def calculate_source_reputation_score(source: Source) -> dict[str, Any]:
    if source.is_known_satire:
        score = 15.0
        label = "Satire / Parody"
    elif source.is_known_misinfo:
        score = 5.0
        label = "Known Misinformation"
    else:
        score = source.historical_accuracy_score
        label = "Verified Publisher" if score >= 80 else ("Moderate Reputation" if score >= 60 else "Low Reputation")

    return {
        "score": score,
        "domain": source.domain,
        "name": source.name,
        "bias_rating": source.bias_rating,
        "whois_age_days": source.whois_age_days,
        "is_known_satire": source.is_known_satire,
        "is_known_misinfo": source.is_known_misinfo,
        "label": label
    }
