import difflib
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


def compute_word_diff(parent_text: str, child_text: str) -> list[dict[str, str]]:
    """
    Computes token-level diff between parent claim text and child variant text.
    Returns list of tokens: [{"text": str, "type": "equal" | "added" | "deleted"}].
    """
    if not parent_text:
        return [{"text": child_text, "type": "added"}]
    if not child_text:
        return [{"text": parent_text, "type": "deleted"}]

    words_p = parent_text.split()
    words_c = child_text.split()
    matcher = difflib.SequenceMatcher(None, words_p, words_c)
    tokens: list[dict[str, str]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for w in words_p[i1:i2]:
                tokens.append({"text": w, "type": "equal"})
        elif tag == "delete":
            for w in words_p[i1:i2]:
                tokens.append({"text": w, "type": "deleted"})
        elif tag == "insert":
            for w in words_c[j1:j2]:
                tokens.append({"text": w, "type": "added"})
        elif tag == "replace":
            for w in words_p[i1:i2]:
                tokens.append({"text": w, "type": "deleted"})
            for w in words_c[j1:j2]:
                tokens.append({"text": w, "type": "added"})
    return tokens


async def find_candidate_parent(
    db: AsyncSession,
    claim: Claim,
    min_similarity: float = 0.45,
    max_similarity: float = 0.96,
) -> tuple[Claim | None, float | None]:
    """
    Searches for an earlier claim (created_at < claim.created_at) whose similarity is
    between min_similarity and max_similarity (a variant mutation, not exact duplicate).
    """
    target_vector = getattr(claim, "embedding", None)
    if not target_vector:
        target_vector = await embed_claim_text(claim.claim_text)

    # Query earlier claims
    cand_stmt = select(Claim).where(
        Claim.id != claim.id,
        Claim.created_at < claim.created_at,
    ).order_by(Claim.created_at.desc())

    cand_res = await db.execute(cand_stmt)
    candidates = cand_res.scalars().all()

    best_parent: Claim | None = None
    best_sim = 0.0

    for cand in candidates:
        cand_vector = getattr(cand, "embedding", None)
        if not cand_vector:
            cand_vector = await embed_claim_text(cand.claim_text)

        sim = cosine_similarity(target_vector, cand_vector)
        if min_similarity <= sim <= max_similarity and sim > best_sim:
            best_sim = sim
            best_parent = cand

    if best_parent:
        mutation_distance = round(1.0 - best_sim, 3)
        return best_parent, mutation_distance

    return None, None


async def assign_claim_parent(db: AsyncSession, claim: Claim) -> Claim:
    """
    Attempts to find and link a candidate parent for the claim, setting parent_claim_id and mutation_score.
    """
    parent, mut_score = await find_candidate_parent(db, claim)
    if parent:
        claim.parent_claim_id = parent.id
        claim.mutation_score = mut_score
        await db.commit()
    return claim


async def get_claim_mutation_chain(db: AsyncSession, claim_id: uuid.UUID) -> dict[str, Any] | None:
    """
    Builds full mutation chain / telephone game lineage for a claim.
    Walks parent pointers back to the root ancestor, then collects all child variants.
    Calculates word-level diffs for each mutation hop.
    """
    target_stmt = select(Claim).where(Claim.id == claim_id)
    target_res = await db.execute(target_stmt)
    target_claim = target_res.scalar_one_or_none()

    if not target_claim:
        return None

    # Step 1: Walk up to root ancestor
    curr = target_claim
    visited = {curr.id}

    while curr.parent_claim_id and curr.parent_claim_id not in visited:
        p_stmt = select(Claim).where(Claim.id == curr.parent_claim_id)
        p_res = await db.execute(p_stmt)
        p_claim = p_res.scalar_one_or_none()
        if not p_claim:
            break
        curr = p_claim
        visited.add(curr.id)

    root_claim = curr

    # Step 2: Collect all descendants linked to this lineage
    # Fetch all claims that share this root or are in visited set
    all_claims_stmt = select(Claim, ContentItem).join(
        ContentItem, Claim.content_item_id == ContentItem.id
    ).order_by(Claim.created_at.asc())
    all_res = await db.execute(all_claims_stmt)
    all_rows = all_res.all()

    # Filter claims in the tree rooted at root_claim
    lineage_map: dict[uuid.UUID, Claim] = {root_claim.id: root_claim}
    item_map: dict[uuid.UUID, ContentItem] = {}

    for c, item in all_rows:
        item_map[c.id] = item

    # Multi-pass tree inclusion
    changed = True
    while changed:
        changed = False
        for c, _ in all_rows:
            if c.id not in lineage_map and c.parent_claim_id in lineage_map:
                lineage_map[c.id] = c
                changed = True

    # Order lineage chronologically
    sorted_lineage = sorted(lineage_map.values(), key=lambda x: x.created_at)

    nodes = []
    for i, c in enumerate(sorted_lineage):
        item = item_map.get(c.id)
        parent = lineage_map.get(c.parent_claim_id) if c.parent_claim_id else None

        diff = compute_word_diff(parent.claim_text if parent else "", c.claim_text)

        nodes.append({
            "claim_id": str(c.id),
            "content_item_id": str(c.content_item_id),
            "claim_text": c.claim_text,
            "extracted_speaker": c.extracted_speaker,
            "verdict": c.verdict,
            "confidence_score": c.confidence_score,
            "mutation_score": c.mutation_score,
            "is_target": c.id == claim_id,
            "is_root": parent is None,
            "parent_claim_id": str(c.parent_claim_id) if c.parent_claim_id else None,
            "title": item.title if item else None,
            "url": item.url if item else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "diff_from_parent": diff,
        })

    return {
        "target_claim_id": str(claim_id),
        "root_claim_id": str(root_claim.id),
        "origin_disclaimer": "Credo Origin Notice: 'Root' represents the earliest variant indexed in Credo's dataset, not an absolute guarantee of historical origin.",
        "chain_length": len(nodes),
        "nodes": nodes,
    }


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

    related.sort(key=lambda x: x["similarity_score"], reverse=True)
    return related[:limit]


__all__ = [
    "cosine_similarity",
    "compute_word_diff",
    "find_candidate_parent",
    "assign_claim_parent",
    "get_claim_mutation_chain",
    "find_related_claims",
]
