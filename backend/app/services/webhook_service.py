import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.webhook import WebhookEndpoint, WebhookDelivery

logger = logging.getLogger(__name__)


def compute_signature(secret: str, payload_bytes: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()


async def dispatch_webhook_event(db: AsyncSession, user_id, event_type: str, payload: dict):
    """
    Finds active webhook endpoints for user_id matching event_type and dispatches event.
    """
    stmt = select(WebhookEndpoint).where(
        WebhookEndpoint.user_id == user_id,
        WebhookEndpoint.is_active == True,
    )
    result = await db.execute(stmt)
    endpoints = result.scalars().all()

    async with httpx.AsyncClient(timeout=10.0) as client:
        for ep in endpoints:
            if event_types_match(ep.event_types, event_type):
                payload_json = json.dumps({"event": event_type, "timestamp": datetime.now(timezone.utc).isoformat(), "data": payload})
                signature = compute_signature(ep.secret, payload_json.encode("utf-8"))
                headers = {
                    "Content-Type": "application/json",
                    "X-Credo-Signature": f"sha256={signature}",
                    "X-Credo-Event": event_type,
                }
                status_code = None
                response_body = ""
                success = False

                try:
                    res = await client.post(ep.url, content=payload_json, headers=headers)
                    status_code = res.status_code
                    response_body = res.text[:2000]
                    success = (200 <= res.status_code < 300)
                except Exception as exc:
                    logger.warning(f"Webhook delivery failed for {ep.url}: {exc}")
                    response_body = str(exc)

                delivery = WebhookDelivery(
                    endpoint_id=ep.id,
                    event_type=event_type,
                    payload=payload,
                    status_code=status_code,
                    response_body=response_body,
                    success=success,
                )
                db.add(delivery)
    await db.commit()


def event_types_match(subscribed_events: list, event_type: str) -> bool:
    return "*" in subscribed_events or event_type in subscribed_events
