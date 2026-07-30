from datetime import UTC, datetime, timedelta
from typing import Any
import logging

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from redis.asyncio import Redis as AsyncRedis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize password hashing using Argon2
password_hash = PasswordHash((Argon2Hasher(),))

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Reduced to 30 minutes for security


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"sub": str(subject), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


async def add_token_to_denylist(token: str, ttl_seconds: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60) -> None:
    """Adds a JWT token to the Redis denylist until expiration."""
    try:
        redis_client = await AsyncRedis.from_url(settings.REDIS_URL, decode_responses=True)
        key = f"token_denylist:{token}"
        await redis_client.setex(key, ttl_seconds, "revoked")
        await redis_client.close()
    except Exception as exc:
        logger.warning(f"Could not add token to Redis denylist: {exc}")


async def is_token_denylisted(token: str) -> bool:
    """Checks whether a token has been revoked / added to denylist."""
    try:
        redis_client = await AsyncRedis.from_url(settings.REDIS_URL, decode_responses=True)
        key = f"token_denylist:{token}"
        is_revoked = await redis_client.exists(key)
        await redis_client.close()
        return bool(is_revoked)
    except Exception as exc:
        logger.warning(f"Could not check token denylist in Redis: {exc}")
        return False
