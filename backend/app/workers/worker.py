import logging
from arq.connections import RedisSettings
from app.core.config import settings

logger = logging.getLogger(__name__)


async def ping_health_task(ctx: dict, message: str) -> str:
    logger.info(f"Worker task executed with message: {message}")
    return f"pong: {message}"


async def startup(ctx: dict) -> None:
    logger.info("ARQ Worker starting up...")


async def shutdown(ctx: dict) -> None:
    logger.info("ARQ Worker shutting down...")


class WorkerSettings:
    functions = [ping_health_task]
    on_startup = startup
    on_shutdown = shutdown

    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
