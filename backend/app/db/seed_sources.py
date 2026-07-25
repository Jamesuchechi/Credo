import asyncio
import logging

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.source import Source

logger = logging.getLogger(__name__)

INITIAL_SOURCES = [
    {
        "domain": "reuters.com",
        "name": "Reuters",
        "historical_accuracy_score": 96.0,
        "bias_rating": "center",
        "whois_age_days": 10500,
        "is_known_satire": False,
        "is_known_misinfo": False
    },
    {
        "domain": "apnews.com",
        "name": "Associated Press",
        "historical_accuracy_score": 95.0,
        "bias_rating": "center",
        "whois_age_days": 9800,
        "is_known_satire": False,
        "is_known_misinfo": False
    },
    {
        "domain": "bbc.com",
        "name": "BBC News",
        "historical_accuracy_score": 92.0,
        "bias_rating": "center",
        "whois_age_days": 10000,
        "is_known_satire": False,
        "is_known_misinfo": False
    },
    {
        "domain": "nytimes.com",
        "name": "The New York Times",
        "historical_accuracy_score": 88.0,
        "bias_rating": "lean-left",
        "whois_age_days": 10200,
        "is_known_satire": False,
        "is_known_misinfo": False
    },
    {
        "domain": "wsj.com",
        "name": "The Wall Street Journal",
        "historical_accuracy_score": 90.0,
        "bias_rating": "lean-right",
        "whois_age_days": 10100,
        "is_known_satire": False,
        "is_known_misinfo": False
    },
    {
        "domain": "theonion.com",
        "name": "The Onion",
        "historical_accuracy_score": 10.0,
        "bias_rating": "satire",
        "whois_age_days": 9500,
        "is_known_satire": True,
        "is_known_misinfo": False
    },
    {
        "domain": "babylonbee.com",
        "name": "The Babylon Bee",
        "historical_accuracy_score": 10.0,
        "bias_rating": "satire",
        "whois_age_days": 3200,
        "is_known_satire": True,
        "is_known_misinfo": False
    },
    {
        "domain": "worldnewsdailyreport.com",
        "name": "World News Daily Report",
        "historical_accuracy_score": 5.0,
        "bias_rating": "fabricated",
        "whois_age_days": 3000,
        "is_known_satire": False,
        "is_known_misinfo": True
    }
]


async def seed_sources():
    async with AsyncSessionLocal() as session:
        for data in INITIAL_SOURCES:
            stmt = select(Source).where(Source.domain == data["domain"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()

            if not existing:
                source = Source(**data)
                session.add(source)

        await session.commit()
        logger.info("Successfully seeded initial domain sources!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_sources())
