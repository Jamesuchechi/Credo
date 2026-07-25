import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

is_upstash_ssl = settings.REDIS_URL.startswith("rediss://")

# Configure Redis client with Upstash TLS/SSL support
redis_client = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    ssl=is_upstash_ssl,
    ssl_cert_reqs=None if is_upstash_ssl else "required"
)


async def check_redis_health() -> bool:
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        logger.warning(f"Redis health ping failed ({settings.REDIS_URL}): {e!s}")
        return False
