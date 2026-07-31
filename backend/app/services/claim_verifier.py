import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim import Claim
from app.schemas.claim import ExtractedClaimItem
from app.services.corroboration.corroboration_service import get_corroborating_sources

logger = logging.getLogger(__name__)


def evaluate_claim_verdict(corroborating_sources: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluates corroborating reference payloads to assign a claim verdict, confidence score, and evidence summary.
    """
    if not corroborating_sources:
        return {
            "verdict": "unverified",
            "confidence_score": 35.0,
            "evidence_summary": "Insufficient independent corroboration found across news wire indexes.",
            "reasoning_notes": "No matching articles found in News API, GNews, or Fact Check Tools."
        }

    contradiction_keywords = ["false", "debunked", "fake", "hoax", "incorrect", "denied", "untrue", "misleading"]
    contradiction_count = 0
    supporting_count = 0

    for source in corroborating_sources:
        title = (source.get("title") or "").lower()
        rating = (source.get("textual_rating") or "").lower()
        
        if any(kw in title or kw in rating for kw in contradiction_keywords):
            contradiction_count += 1
        else:
            supporting_count += 1

    if contradiction_count > 0:
        return {
            "verdict": "contradicted",
            "confidence_score": min(70.0 + (contradiction_count * 10), 95.0),
            "evidence_summary": f"Contradicted or flagged as misleading by {contradiction_count} independent reference(s).",
            "reasoning_notes": f"Detected conflicting reports in {corroborating_sources[0].get('source', 'news indexes')}."
        }

    return {
        "verdict": "supported",
        "confidence_score": min(65.0 + (supporting_count * 8), 96.0),
        "evidence_summary": f"Corroborated by {supporting_count} independent news source(s).",
        "reasoning_notes": f"Primary matching reference: {corroborating_sources[0].get('title', 'Verified Article')}."
    }


async def verify_and_create_claim(
    db: AsyncSession,
    content_item_id: uuid.UUID,
    extracted_claim: ExtractedClaimItem
) -> Claim:
    """
    Corroborates an extracted claim against news wire APIs, evaluates verdict, and builds the Claim model.
    """
    # 1. Fetch corroborating references for claim text
    references = await get_corroborating_sources(extracted_claim.claim_text)

    # 2. Evaluate verdict and confidence score
    eval_result = evaluate_claim_verdict(references)

    # 3. Compute TTL (7 days)
    now = datetime.utcnow()
    ttl_expires = now + timedelta(days=7)

    # 4. Compute vector embedding for topic clustering
    from app.services.embedding_service import embed_claim_text
    embedding_vector = await embed_claim_text(extracted_claim.claim_text)

    # 5. Construct Claim object
    claim = Claim(
        id=uuid.uuid4(),
        content_item_id=content_item_id,
        claim_text=extracted_claim.claim_text,
        extracted_speaker=extracted_claim.extracted_speaker,
        verdict=eval_result["verdict"],
        confidence_score=eval_result["confidence_score"],
        evidence_summary=eval_result["evidence_summary"],
        reasoning_chain={
            "notes": eval_result["reasoning_notes"],
            "corroborating_references": references[:3]
        },
        created_at=now,
        ttl_expires_at=ttl_expires
    )
    if hasattr(claim, "embedding"):
        setattr(claim, "embedding", embedding_vector)

    db.add(claim)
    return claim
