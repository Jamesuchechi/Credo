import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.models.content_item import ContentItem
from app.models.user import User
from app.services.privacy_service import PrivacyService


@pytest.mark.asyncio
async def test_privacy_purge_anonymizes_expired_raw_payload():
    user = User(
        id=uuid.uuid4(),
        email="privacy@example.com",
        hashed_password="hashed_test_pass",
        full_name="Privacy Test User",
        is_active=True,
    )

    old_date = datetime.now(timezone.utc) - timedelta(days=35)
    expired_item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,
        modality="text",
        content_hash="hash123",
        raw_payload="Sensitive user content that should be purged after 30 days",
        status="complete",
        created_at=old_date,
    )

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [expired_item]
    mock_db.execute.return_value = mock_res

    privacy_svc = PrivacyService(retention_days=30)
    purged_count = await privacy_svc.sanitize_and_anonymize_expired_items(mock_db)

    assert purged_count == 1
    assert expired_item.raw_payload == "[ANONYMIZED_AND_PURGED_PER_DATA_RETENTION_POLICY]"
