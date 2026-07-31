import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.analysis_result import AnalysisResult
from app.models.content_item import ContentItem
from app.models.social_author import SocialAuthor
from app.models.user import User
from app.services.author_reputation_service import (
    calculate_author_reputation_score,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/authors", tags=["Author Reputation"])


class AuthorProfileResponse(BaseModel):
    author_id: str
    platform: str
    handle: str
    display_name: str | None
    verified: bool
    follower_count: int | None
    account_created_at: str | None
    reputation_score: float
    label: str
    total_claims_analyzed: int
    supported_claims_count: int
    contradicted_claims_count: int
    unverified_claims_count: int
    total_posts_analyzed: int
    user_analyzed_items: list[dict[str, Any]]


@router.get("/{platform}/{handle}", response_model=AuthorProfileResponse)
async def get_author_profile(
    platform: str,
    handle: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves social author profile, verification badge, follower stats,
    reputation score breakdown, and the current user's past analyzed items from this author.
    """
    clean_platform = platform.lower().strip()
    clean_handle = handle.strip().lstrip("@")

    stmt = select(SocialAuthor).where(
        SocialAuthor.platform == clean_platform,
        SocialAuthor.handle == clean_handle,
    )
    res = await db.execute(stmt)
    author = res.scalar_one_or_none()

    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Author profile @{clean_handle} on platform '{clean_platform}' not found",
        )

    score_info = await calculate_author_reputation_score(db, author)

    # Fetch user's own analyzed items from this author (respecting privacy boundaries)
    items_stmt = select(ContentItem).where(
        ContentItem.social_author_id == author.id,
        ContentItem.user_id == current_user.id,
    ).order_by(ContentItem.created_at.desc()).limit(20)
    items_res = await db.execute(items_stmt)
    user_items = items_res.scalars().all()

    user_analyzed_items = []
    for item in user_items:
        res_stmt = select(AnalysisResult.composite_score).where(
            AnalysisResult.content_item_id == item.id
        )
        res_exec = await db.execute(res_stmt)
        comp_score = res_exec.scalar_one_or_none()
        user_analyzed_items.append({
            "content_id": str(item.id),
            "title": item.title or item.raw_payload[:80],
            "modality": item.modality,
            "status": item.status,
            "composite_score": comp_score,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        })

    account_created_iso = (
        author.account_created_at.isoformat() if author.account_created_at else None
    )

    return AuthorProfileResponse(
        author_id=str(author.id),
        platform=author.platform,
        handle=author.handle,
        display_name=author.display_name,
        verified=author.verified,
        follower_count=author.follower_count,
        account_created_at=account_created_iso,
        reputation_score=score_info["reputation_score"],
        label=score_info["label"],
        total_claims_analyzed=score_info["total_claims_analyzed"],
        supported_claims_count=score_info["supported_claims_count"],
        contradicted_claims_count=score_info["contradicted_claims_count"],
        unverified_claims_count=score_info["unverified_claims_count"],
        total_posts_analyzed=score_info["total_posts_analyzed"],
        user_analyzed_items=user_analyzed_items,
    )
