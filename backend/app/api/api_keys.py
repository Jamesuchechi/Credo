import uuid
import secrets
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.user import User

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


class ApiKeyCreateRequest(BaseModel):
    name: str
    scopes: list[str] = ["read_only"]


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    prefix: str
    scopes: list[str]
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None = None
    secret_key: str | None = None


@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id, ApiKey.is_active.is_(True))
        .order_by(ApiKey.created_at.desc())
    )
    result = await db.execute(stmt)
    keys = result.scalars().all()
    return keys


@router.post("", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw_random = secrets.token_hex(20)
    secret_key = f"cr_live_{raw_random}"
    prefix = secret_key[:12]
    key_hash = hashlib.sha256(secret_key.encode("utf-8")).hexdigest()

    new_key = ApiKey(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=payload.name.strip() or "Standard API Token",
        prefix=prefix,
        key_hash=key_hash,
        scopes=payload.scopes,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(new_key)
    await db.commit()

    return ApiKeyResponse(
        id=new_key.id,
        name=new_key.name,
        prefix=new_key.prefix,
        scopes=new_key.scopes,
        is_active=new_key.is_active,
        created_at=new_key.created_at,
        last_used_at=new_key.last_used_at,
        secret_key=secret_key,
    )


@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
async def revoke_api_key(
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    result = await db.execute(stmt)
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key.is_active = False
    await db.commit()
    return {"message": "API key revoked successfully"}
