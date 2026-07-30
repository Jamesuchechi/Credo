import hashlib
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limiter import (
    check_account_lockout,
    check_rate_limit,
    get_client_ip,
    record_failed_login,
    reset_failed_logins,
)
from app.core.security import (
    add_token_to_denylist,
    create_access_token,
    decode_access_token,
    hash_password,
    is_token_denylisted,
    verify_password,
)
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.services.audit_service import log_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    # 1. Check for X-API-Key authentication header
    x_api_key = request.headers.get("X-API-Key")
    if x_api_key:
        key_hash = hashlib.sha256(x_api_key.encode("utf-8")).hexdigest()
        stmt = select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True))
        res = await db.execute(stmt)
        api_key_obj = res.scalar_one_or_none()

        if api_key_obj:
            api_key_obj.last_used_at = datetime.utcnow()
            await db.commit()

            user_stmt = select(User).where(User.id == api_key_obj.user_id, User.is_active.is_(True))
            user_res = await db.execute(user_stmt)
            user = user_res.scalar_one_or_none()
            if user:
                return user

    # 2. Allow token from query params ONLY for SSE stream endpoints
    if token is None and request.url.path.endswith("/stream"):
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Check if token is denylisted/revoked
    if await is_token_denylisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked or logged out",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Decode JWT token
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload["sub"]
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated",
        )

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Security dependency enforcing administrative or moderator privileges.
    """
    if current_user.role not in ("admin", "moderator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Administrative or moderator role required."
        )
    return current_user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    request: UserCreate,
    raw_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new user account and returns a JWT authentication bearer token.
    """
    client_ip = get_client_ip(raw_request)
    await check_rate_limit(client_ip, "auth_register", max_requests=10, window_seconds=60)

    stmt = select(User).where(User.email == request.email.lower())
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        await log_audit_event(
            db, action="auth.register.failure", request=raw_request, metadata={"email": request.email.lower(), "reason": "email_exists"}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    new_user = User(
        id=uuid.uuid4(),
        email=request.email.lower(),
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        role="user",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token(subject=str(new_user.id))

    await log_audit_event(
        db, action="auth.register.success", actor_user_id=new_user.id, request=raw_request, metadata={"email": new_user.email}
    )

    user_res = UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=getattr(new_user, "role", None) or "user",
        is_active=new_user.is_active,
        created_at=new_user.created_at,
    )

    return TokenResponse(access_token=token, token_type="bearer", user=user_res)


@router.post("/login", response_model=TokenResponse)
async def login_user(
    request: UserLogin,
    raw_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticates email & password credentials and returns a JWT authentication bearer token.
    Enforces rate limiting and account lockout on consecutive failures.
    """
    client_ip = get_client_ip(raw_request)
    await check_rate_limit(client_ip, "auth_login", max_requests=15, window_seconds=60)
    await check_account_lockout(request.email)

    stmt = select(User).where(User.email == request.email.lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        await record_failed_login(request.email)
        await log_audit_event(
            db, action="auth.login.failure", request=raw_request, metadata={"email": request.email.lower()}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated.",
        )

    await reset_failed_logins(request.email)
    token = create_access_token(subject=str(user.id))

    await log_audit_event(
        db, action="auth.login.success", actor_user_id=user.id, request=raw_request, metadata={"email": user.email}
    )

    user_res = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=getattr(user, "role", None) or "user",
        is_active=user.is_active,
        created_at=user.created_at,
    )

    return TokenResponse(access_token=token, token_type="bearer", user=user_res)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(
    raw_request: Request,
    token: str | None = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes the current user's JWT access token by adding it to the Redis denylist.
    """
    if token:
        await add_token_to_denylist(token)

    await log_audit_event(
        db, action="auth.logout", actor_user_id=current_user.id, request=raw_request
    )
    return {"message": "Successfully logged out and revoked access token."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns authenticated user profile information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=getattr(current_user, "role", None) or "user",
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )
