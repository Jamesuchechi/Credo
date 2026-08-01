
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    DATABASE_URL: str = "postgresql+asyncpg://credo:credopassword@localhost:5432/credo"
    REDIS_URL: str = "redis://localhost:6379/0"

    OPENROUTER_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    NEWS_API_KEY: str = ""
    GNEWS_API_KEY: str = ""
    GOOGLE_FACT_CHECK_API_KEY: str = ""
    WHOIS_API_KEY: str = ""
    GOOGLE_VISION_API_KEY: str = ""

    # Social Ingestion APIs
    X_API_BEARER_TOKEN: str = ""
    REDDIT_CLIENT_ID: str = ""
    REDDIT_CLIENT_SECRET: str = ""

    # Receipt Signing Security
    RECEIPT_SIGNING_KEY: str = "dev-receipt-signing-key-min-32-chars-change-in-prod"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
