import logging
import uuid
from datetime import datetime

from app.core.rate_limiter import get_redis_client

logger = logging.getLogger(__name__)

# Default daily LLM spend limit per user ($5.00 USD)
DEFAULT_DAILY_SPEND_LIMIT_USD = 5.00


def _get_spend_key(user_id: str | uuid.UUID) -> str:
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    return f"llm_spend:{user_id}:{today_str}"


async def get_user_daily_spend(user_id: str | uuid.UUID) -> float:
    """
    Returns the accumulated LLM token spend (in USD) for a user for today.
    """
    redis_client = await get_redis_client()
    try:
        key = _get_spend_key(user_id)
        val = await redis_client.get(key)
        return float(val) if val else 0.0
    except Exception as exc:
        logger.warning(f"Redis get_user_daily_spend error: {exc}")
        return 0.0
    finally:
        await redis_client.aclose()


async def record_llm_spend(user_id: str | uuid.UUID, cost_usd: float) -> float:
    """
    Records LLM API invocation cost (in USD) for a user and sets a 24-hour TTL on the daily key.
    """
    redis_client = await get_redis_client()
    try:
        key = _get_spend_key(user_id)
        current = await redis_client.incrbyfloat(key, cost_usd)
        await redis_client.expire(key, 86400)
        return float(current)
    except Exception as exc:
        logger.warning(f"Redis record_llm_spend error: {exc}")
        return 0.0
    finally:
        await redis_client.aclose()


async def check_daily_llm_spend_limit(
    user_id: str | uuid.UUID,
    max_daily_usd: float = DEFAULT_DAILY_SPEND_LIMIT_USD,
) -> tuple[bool, float]:
    """
    Checks whether a user has exceeded their maximum daily LLM spend limit.
    Returns (is_exceeded, current_spend).
    """
    current_spend = await get_user_daily_spend(user_id)
    is_exceeded = current_spend >= max_daily_usd
    return is_exceeded, current_spend


__all__ = [
    "get_user_daily_spend",
    "record_llm_spend",
    "check_daily_llm_spend_limit",
    "DEFAULT_DAILY_SPEND_LIMIT_USD",
]
