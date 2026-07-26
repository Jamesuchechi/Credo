from fastapi import APIRouter

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.content import router as content_router
from app.db.redis import check_redis_health

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(content_router)
api_router.include_router(analytics_router)


@api_router.get("/health", tags=["Health"])
async def health_check():
    redis_ok = await check_redis_health()
    return {
        "status": "ok",
        "version": "0.1.0",
        "redis": "connected" if redis_ok else "disconnected"
    }
