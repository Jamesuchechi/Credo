import uuid
from unittest.mock import AsyncMock
import pytest

from app.models.user import User
from app.services.audit_service import log_audit_event


@pytest.mark.asyncio
async def test_audit_log_creation():
    user = User(
        id=uuid.uuid4(),
        email="audit@example.com",
        hashed_password="hashed_test_pass",
        full_name="Audit Test User",
        is_active=True,
    )

    mock_db = AsyncMock()

    audit_entry = await log_audit_event(
        mock_db,
        action="auth.login.success",
        actor_user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        ip_address="192.168.1.50",
        user_agent="TestAgent/1.0",
        metadata={"login_method": "password"},
    )

    assert audit_entry.id is not None
    assert audit_entry.action == "auth.login.success"
    assert audit_entry.actor_user_id == user.id
    assert audit_entry.ip_address == "192.168.1.50"
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
