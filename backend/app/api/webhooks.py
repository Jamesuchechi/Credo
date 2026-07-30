import uuid
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.webhook import WebhookEndpoint, WebhookDelivery

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class WebhookCreate(BaseModel):
    url: str
    event_types: Optional[List[str]] = ["analysis.completed", "claim.status_changed"]


class WebhookResponse(BaseModel):
    id: uuid.UUID
    url: str
    secret: str
    event_types: List[str]
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class WebhookDeliveryResponse(BaseModel):
    id: uuid.UUID
    endpoint_id: uuid.UUID
    event_type: str
    status_code: Optional[int]
    success: bool
    created_at: str


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    data: WebhookCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    secret = secrets.token_hex(32)
    endpoint = WebhookEndpoint(
        user_id=current_user.id,
        url=data.url,
        secret=secret,
        event_types=data.event_types or ["analysis.completed"],
    )
    db.add(endpoint)
    await db.commit()
    await db.refresh(endpoint)

    return WebhookResponse(
        id=endpoint.id,
        url=endpoint.url,
        secret=endpoint.secret,
        event_types=endpoint.event_types,
        is_active=endpoint.is_active,
        created_at=endpoint.created_at.isoformat(),
    )


@router.get("", response_model=List[WebhookResponse])
async def list_webhooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(WebhookEndpoint).where(WebhookEndpoint.user_id == current_user.id)
    res = await db.execute(stmt)
    endpoints = res.scalars().all()

    return [
        WebhookResponse(
            id=ep.id,
            url=ep.url,
            secret=ep.secret,
            event_types=ep.event_types,
            is_active=ep.is_active,
            created_at=ep.created_at.isoformat(),
        )
        for ep in endpoints
    ]


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == webhook_id, WebhookEndpoint.user_id == current_user.id)
    res = await db.execute(stmt)
    ep = res.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook endpoint not found")

    await db.delete(ep)
    await db.commit()


@router.get("/{webhook_id}/deliveries", response_model=List[WebhookDeliveryResponse])
async def get_webhook_deliveries(
    webhook_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(WebhookEndpoint).where(WebhookEndpoint.id == webhook_id, WebhookEndpoint.user_id == current_user.id)
    res = await db.execute(stmt)
    ep = res.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook endpoint not found")

    deliv_stmt = select(WebhookDelivery).where(WebhookDelivery.endpoint_id == webhook_id).order_by(WebhookDelivery.created_at.desc())
    deliv_res = await db.execute(deliv_stmt)
    deliveries = deliv_res.scalars().all()

    return [
        WebhookDeliveryResponse(
            id=d.id,
            endpoint_id=d.endpoint_id,
            event_type=d.event_type,
            status_code=d.status_code,
            success=d.success,
            created_at=d.created_at.isoformat(),
        )
        for d in deliveries
    ]
