import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.services.whois_service import extract_domain, get_domain_age_days

logger = logging.getLogger(__name__)

# Baseline historical accuracy seeding dataset for African/Nigerian news publishers
AFRICAN_NEWS_DOMAIN_SEED = {
    "channelstv.com": {"name": "Channels Television", "score": 93.0, "bias": "least_biased"},
    "premiumtimesng.com": {"name": "Premium Times Nigeria", "score": 92.0, "bias": "least_biased"},
    "thecable.ng": {"name": "TheCable", "score": 91.0, "bias": "least_biased"},
    "punchng.com": {"name": "Punch Newspapers", "score": 90.0, "bias": "center_right"},
    "vanguardngr.com": {"name": "Vanguard News", "score": 88.0, "bias": "center_left"},
    "pulse.ng": {"name": "Pulse Nigeria", "score": 82.0, "bias": "center"},
    "saharareporters.com": {"name": "Sahara Reporters", "score": 78.0, "bias": "left"},
    "lindaikejisblog.com": {"name": "Linda Ikeji's Blog", "score": 65.0, "bias": "sensational"},
}


async def get_or_create_source(db: AsyncSession, domain_raw: str) -> Source:
    domain = extract_domain(domain_raw)
    stmt = select(Source).where(Source.domain == domain)
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        whois_age = get_domain_age_days(domain)
        
        # Check if domain exists in regional seed database
        if domain in AFRICAN_NEWS_DOMAIN_SEED:
            seed_info = AFRICAN_NEWS_DOMAIN_SEED[domain]
            base_score = seed_info["score"]
            name = seed_info["name"]
            bias = seed_info["bias"]
        else:
            base_score = 50.0 + min(whois_age / 365.0 * 5.0, 25.0) if whois_age else 60.0
            name = domain.capitalize()
            bias = "unrated"

        source = Source(
            domain=domain,
            name=name,
            historical_accuracy_score=round(base_score, 1),
            bias_rating=bias,
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
