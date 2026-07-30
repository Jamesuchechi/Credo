"""
Privacy and Data Retention Pipeline for Credo.

Handles automated purging and anonymization of user-submitted content
and PII past configurable retention windows (e.g. 30 days) to comply with
NDPR/GDPR regulations.
"""

import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content_item import ContentItem

logger = logging.getLogger(__name__)


class PrivacyService:
    def __init__(self, retention_days: int = 30):
        self.retention_days = retention_days

    async def sanitize_and_anonymize_expired_items(self, db: AsyncSession) -> int:
        """Anonymizes and purges raw payload for content items older than retention window."""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.retention_days)

        stmt = select(ContentItem).where(ContentItem.created_at <= cutoff_date)
        res = await db.execute(stmt)
        expired_items = res.scalars().all()

        purged_count = 0
        for item in expired_items:
            if item.raw_payload and item.raw_payload != "[ANONYMIZED_AND_PURGED_PER_DATA_RETENTION_POLICY]":
                item.raw_payload = "[ANONYMIZED_AND_PURGED_PER_DATA_RETENTION_POLICY]"
                purged_count += 1

        if purged_count > 0:
            await db.commit()
            logger.info(f"Privacy Purge: Anonymized {purged_count} content items older than {cutoff_date}")

        return purged_count
