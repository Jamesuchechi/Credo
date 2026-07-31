import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.models.social_author import SocialAuthor

logger = logging.getLogger(__name__)


async def get_or_create_social_author(
    db: AsyncSession,
    platform: str,
    handle: str,
    display_name: str | None = None,
    verified: bool = False,
    follower_count: int | None = None,
    account_created_at: datetime | None = None,
) -> SocialAuthor:
    """
    Finds or creates a SocialAuthor by (platform, handle).
    Updates author stats if new metadata is provided.
    """
    clean_handle = handle.strip().lstrip("@")
    clean_platform = platform.lower().strip()

    stmt = select(SocialAuthor).where(
        SocialAuthor.platform == clean_platform,
        SocialAuthor.handle == clean_handle,
    )
    res = await db.execute(stmt)
    author = res.scalar_one_or_none()

    if not author:
        author = SocialAuthor(
            platform=clean_platform,
            handle=clean_handle,
            display_name=display_name or clean_handle,
            verified=verified,
            follower_count=follower_count,
            account_created_at=account_created_at,
        )
        db.add(author)
        await db.commit()
        await db.refresh(author)
    else:
        updated = False
        if display_name and author.display_name != display_name:
            author.display_name = display_name
            updated = True
        if verified and not author.verified:
            author.verified = verified
            updated = True
        if follower_count is not None and author.follower_count != follower_count:
            author.follower_count = follower_count
            updated = True
        if updated:
            await db.commit()
            await db.refresh(author)

    return author


async def calculate_author_reputation_score(
    db: AsyncSession, author: SocialAuthor
) -> dict[str, Any]:
    """
    Computes an author reputation score from:
    1. Historical verdict distribution of past claims in content items by this author.
    2. Verification status (verified badge).
    3. Account age and reach (follower count).
    """
    # Fetch content item IDs for this author
    item_stmt = select(ContentItem.id).where(ContentItem.social_author_id == author.id)
    item_res = await db.execute(item_stmt)
    item_ids = item_res.scalars().all()

    supported_count = 0
    contradicted_count = 0
    unverified_count = 0
    total_claims = 0

    if item_ids:
        claim_stmt = select(Claim.verdict, func.count(Claim.id)).where(
            Claim.content_item_id.in_(item_ids)
        ).group_by(Claim.verdict)
        claim_res = await db.execute(claim_stmt)
        for verdict, count in claim_res.all():
            total_claims += count
            if verdict == "supported":
                supported_count += count
            elif verdict == "contradicted":
                contradicted_count += count
            else:
                unverified_count += count

    # Baseline score calculation
    if total_claims == 0:
        base = 65.0
    else:
        # Weighted ratio: supported adds 100%, contradicted adds 0%, unverified adds 40%
        raw_accuracy = ((supported_count * 100.0) + (unverified_count * 40.0)) / total_claims
        base = 0.7 * raw_accuracy + 0.3 * 65.0

    # Verification bonus
    verified_bonus = 15.0 if author.verified else 0.0

    # Account age bonus (up to 10 points for older accounts)
    age_bonus = 0.0
    if author.account_created_at:
        now = datetime.now(timezone.utc)
        created_at = author.account_created_at.replace(tzinfo=timezone.utc) if author.account_created_at.tzinfo is None else author.account_created_at
        days_old = max(0, (now - created_at).days)
        age_bonus = min(10.0, days_old / 365.0 * 2.5)

    final_score = round(max(0.0, min(100.0, base + verified_bonus + age_bonus)), 1)

    if final_score >= 80.0:
        label = "High Reputation"
    elif final_score >= 60.0:
        label = "Moderate Reputation"
    elif final_score >= 40.0:
        label = "Unverified / Unknown"
    else:
        label = "Low Reputation"

    return {
        "author_id": str(author.id),
        "platform": author.platform,
        "handle": author.handle,
        "display_name": author.display_name or author.handle,
        "verified": author.verified,
        "follower_count": author.follower_count,
        "account_created_at": author.account_created_at,
        "reputation_score": final_score,
        "label": label,
        "total_claims_analyzed": total_claims,
        "supported_claims_count": supported_count,
        "contradicted_claims_count": contradicted_count,
        "unverified_claims_count": unverified_count,
        "total_posts_analyzed": len(item_ids),
    }


__all__ = [
    "get_or_create_social_author",
    "calculate_author_reputation_score",
]
