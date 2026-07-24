from fastapi import APIRouter
from app.db.redis import check_redis_health

api_router = APIRouter(prefix="/api/v1")


@api_router.get("/health", tags=["Health"])
async def health_check():
    redis_ok = await check_redis_health()
    return {
        "status": "ok",
        "version": "0.1.0",
        "redis": "connected" if redis_ok else "disconnected"
    }
