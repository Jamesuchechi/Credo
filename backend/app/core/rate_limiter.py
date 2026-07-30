import logging
from fastapi import HTTPException, Request, status
from redis.asyncio import Redis as AsyncRedis

from app.core.config import settings

logger = logging.getLogger(__name__)


async def get_redis_client() -> AsyncRedis:
    return await AsyncRedis.from_url(settings.REDIS_URL, decode_responses=True)


async def check_rate_limit(
    identifier: str,
    action: str,
    max_requests: int,
    window_seconds: int,
) -> None:
    """
    Redis-backed rate limiter using sliding window expiration.
    Throws HTTP 429 if request count exceeds max_requests within window_seconds.
    """
    redis_client = await get_redis_client()
    key = f"rate_limit:{action}:{identifier}"
    try:
        current_count = await redis_client.incr(key)
        if current_count == 1:
            await redis_client.expire(key, window_seconds)

        if current_count > max_requests:
            ttl = await redis_client.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {ttl if ttl > 0 else window_seconds} seconds.",
                headers={"Retry-After": str(ttl if ttl > 0 else window_seconds)},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Rate limiter Redis check failed ({key}): {exc}")
    finally:
        await redis_client.close()


def get_client_ip(request: Request) -> str:
    """Extracts client IP address from headers or connection client."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def check_account_lockout(email: str) -> None:
    """Checks if an account or email is locked out due to repeated failed logins."""
    redis_client = await get_redis_client()
    key = f"lockout:failed_logins:{email.lower()}"
    try:
        attempts_str = await redis_client.get(key)
        if attempts_str and int(attempts_str) >= 5:
            ttl = await redis_client.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked due to 5 consecutive failed login attempts. Try again in {ttl // 60 + 1} minutes.",
            )
    finally:
        await redis_client.close()


async def record_failed_login(email: str) -> None:
    """Increments failed login counter for an email, setting a 15-minute lock on 5 failures."""
    redis_client = await get_redis_client()
    key = f"lockout:failed_logins:{email.lower()}"
    try:
        attempts = await redis_client.incr(key)
        if attempts == 1:
            await redis_client.expire(key, 900)  # 15 minutes window
    finally:
        await redis_client.close()


async def reset_failed_logins(email: str) -> None:
    """Resets failed login attempt counter upon successful login."""
    redis_client = await get_redis_client()
    key = f"lockout:failed_logins:{email.lower()}"
    try:
        await redis_client.delete(key)
    finally:
        await redis_client.close()
