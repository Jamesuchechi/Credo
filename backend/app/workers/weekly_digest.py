"""
Weekly Credibility Digest Worker Task for Credo.

Compiles user weekly credibility metrics (total analyses, average score,
high-risk content flagged) and prepares summary digest objects.
"""

import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content_item import ContentItem
from app.models.analysis_result import AnalysisResult
from app.models.user import User

logger = logging.getLogger(__name__)


async def generate_user_weekly_digest(db: AsyncSession, user_id) -> dict:
    """Generates weekly credibility statistics for a given user."""
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    stmt = (
        select(
            func.count(ContentItem.id).label("total_items"),
            func.avg(AnalysisResult.composite_score).label("avg_score"),
        )
        .join(AnalysisResult, ContentItem.id == AnalysisResult.content_item_id)
        .where(
            ContentItem.user_id == user_id,
            ContentItem.created_at >= one_week_ago,
        )
    )

    res = await db.execute(stmt)
    total_items, avg_score = res.first() or (0, 0.0)

    digest = {
        "user_id": str(user_id),
        "period": "weekly",
        "total_analyzed": total_items or 0,
        "average_credibility_score": round(float(avg_score or 0.0), 1),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(f"Generated weekly digest for user {user_id}: {digest}")
    return digest
