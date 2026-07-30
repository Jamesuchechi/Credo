import logging
import uuid
from typing import Any
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limiter import get_client_ip
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


async def log_audit_event(
    db: AsyncSession,
    action: str,
    actor_user_id: uuid.UUID | str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    request: Request | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    """
    Creates and persists an immutable audit log entry in the database.
    """
    if request:
        if not ip_address:
            ip_address = get_client_ip(request)
        if not user_agent:
            user_agent = request.headers.get("User-Agent", "")[:500]

    actor_uuid = None
    if actor_user_id:
        if isinstance(actor_user_id, str):
            try:
                actor_uuid = uuid.UUID(actor_user_id)
            except ValueError:
                actor_uuid = None
        else:
            actor_uuid = actor_user_id

    audit_entry = AuditLog(
        id=uuid.uuid4(),
        actor_user_id=actor_uuid,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata_json=metadata,
    )
    db.add(audit_entry)
    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.error(f"Failed to save audit log entry ({action}): {exc}")

    return audit_entry
