import logging
import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.services.embedding_service import embed_claim_text

logger = logging.getLogger(__name__)


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    n1 = math.sqrt(sum(a * a for a in v1))
    n2 = math.sqrt(sum(b * b for b in v2))
    if n1 == 0.0 or n2 == 0.0:
        return 0.0
    return dot / (n1 * n2)


async def find_related_claims(
    db: AsyncSession,
    claim_id: uuid.UUID,
    limit: int = 5,
    similarity_threshold: float = 0.35,
    recency_days: int = 30,
) -> list[dict[str, Any]]:
    """
    Finds top N related claims across other content items using vector embedding cosine similarity.
    Filters by recency window (default 30 days) and minimum similarity threshold.
    """
    target_stmt = select(Claim).where(Claim.id == claim_id)
    target_res = await db.execute(target_stmt)
    target_claim = target_res.scalar_one_or_none()

    if not target_claim:
        return []

    target_vector = getattr(target_claim, "embedding", None)
    if not target_vector:
        target_vector = await embed_claim_text(target_claim.claim_text)

    cutoff_date = datetime.utcnow() - timedelta(days=recency_days)

    # Query candidate claims from other content items
    cand_stmt = select(Claim, ContentItem).join(
        ContentItem, Claim.content_item_id == ContentItem.id
    ).where(
        Claim.id != claim_id,
        Claim.content_item_id != target_claim.content_item_id,
        Claim.created_at >= cutoff_date,
    )

    cand_res = await db.execute(cand_stmt)
    candidates = cand_res.all()

    related = []
    for cand_claim, cand_item in candidates:
        cand_vector = getattr(cand_claim, "embedding", None)
        if not cand_vector:
            cand_vector = await embed_claim_text(cand_claim.claim_text)

        sim = cosine_similarity(target_vector, cand_vector)

        if sim >= similarity_threshold:
            related.append({
                "claim_id": str(cand_claim.id),
                "content_id": str(cand_item.id),
                "claim_text": cand_claim.claim_text,
                "extracted_speaker": cand_claim.extracted_speaker,
                "verdict": cand_claim.verdict,
                "confidence_score": cand_claim.confidence_score,
                "evidence_summary": cand_claim.evidence_summary,
                "url": cand_item.url,
                "title": cand_item.title,
                "similarity_score": round(sim, 3),
                "created_at": cand_claim.created_at.isoformat() if cand_claim.created_at else None,
            })

    # Sort descending by similarity score
    related.sort(key=lambda x: x["similarity_score"], reverse=True)
    return related[:limit]


__all__ = [
    "cosine_similarity",
    "find_related_claims",
]
