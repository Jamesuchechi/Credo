from sqlalchemy import text

from app.db.session import engine
from app.models import Base


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Auto-migrate existing tables for SQLite / dev environments if columns are missing
        columns_to_add = [
            "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL",
            "ALTER TABLE content_items ADD COLUMN social_author_id VARCHAR(36)",
            "ALTER TABLE content_items ADD COLUMN has_flagged_source_update BOOLEAN DEFAULT 0 NOT NULL",
            "ALTER TABLE content_items ADD COLUMN source_update_notice TEXT",
            "ALTER TABLE claims ADD COLUMN parent_claim_id VARCHAR(36)",
            "ALTER TABLE claims ADD COLUMN mutation_score FLOAT",
            "ALTER TABLE claims ADD COLUMN embedding JSON",
        ]
        for stmt in columns_to_add:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # Column already exists in database
