from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "production":
        if settings.SECRET_KEY.startswith("dev-"):
            raise RuntimeError(
                "CRITICAL SECURITY FAILURE: Production environment cannot be run with default dev SECRET_KEY!"
            )
        if "credopassword" in settings.DATABASE_URL:
            raise RuntimeError(
                "CRITICAL SECURITY FAILURE: Production environment cannot be run with default PostgreSQL password!"
            )
    await init_db()
    yield


app = FastAPI(
    title="Credo API",
    description="Multi-modal credibility infrastructure engine",
    version="0.1.0",
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def root_health():
    return {"status": "ok", "service": "credo-backend"}
