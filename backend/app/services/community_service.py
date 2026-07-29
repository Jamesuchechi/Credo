import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis_result import AnalysisResult
from app.models.claim import Claim
from app.models.claim_correction import ClaimCorrection
from app.models.content_item import ContentItem
from app.models.contributor import Contributor
from app.models.source import Source
from app.models.user import User
from app.schemas.community import CorrectionSubmissionRequest
from app.services.scoring_service import compute_phase3_composite_score

logger = logging.getLogger(__name__)

ROLE_BASE_WEIGHTS = {
    "community": 1.0,
    "journalist": 2.5,
    "expert": 3.5,
    "admin": 5.0,
}


async def get_or_create_contributor(db: AsyncSession, user: User) -> Contributor:
    """Retrieves or creates a Contributor profile for the given user."""
    stmt = select(Contributor).where(Contributor.user_id == user.id)
    res = await db.execute(stmt)
    contributor = res.scalar_one_or_none()

    if not contributor:
        contributor = Contributor(
            id=uuid.uuid4(),
            user_id=user.id,
            role="community",
            reputation_score=50.0,
            verified_submissions_count=0,
            accuracy_rate=0.0,
            created_at=datetime.utcnow(),
        )
        db.add(contributor)
        await db.commit()
        await db.refresh(contributor)

    return contributor


def calculate_contributor_weight(contributor: Contributor) -> float:
    """Calculates weighting factor for a contributor based on role and reputation score."""
    base_weight = ROLE_BASE_WEIGHTS.get(contributor.role, 1.0)
    rep_factor = max(0.1, contributor.reputation_score / 100.0)
    return round(base_weight * rep_factor, 2)


async def submit_claim_correction(
    db: AsyncSession,
    claim_id: uuid.UUID,
    contributor: Contributor,
    request: CorrectionSubmissionRequest,
) -> ClaimCorrection:
    """Creates a new community claim correction / evidence submission."""
    correction = ClaimCorrection(
        id=uuid.uuid4(),
        claim_id=claim_id,
        contributor_id=contributor.id,
        proposed_verdict=request.proposed_verdict,
        evidence_text=request.evidence_text,
        evidence_urls=request.evidence_urls,
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(correction)
    await db.commit()
    await db.refresh(correction)
    return correction


async def review_claim_correction(
    db: AsyncSession,
    correction_id: uuid.UUID,
    reviewer: Contributor,
    decision: str,
    review_notes: str | None = None,
) -> ClaimCorrection:
    """Processes an expert/journalist review decision on a claim correction."""
    stmt = select(ClaimCorrection).where(ClaimCorrection.id == correction_id)
    res = await db.execute(stmt)
    correction = res.scalar_one_or_none()

    if not correction:
        raise ValueError("Claim correction not found")

    correction.status = decision
    correction.reviewer_id = reviewer.id
    correction.review_notes = review_notes
    correction.reviewed_at = datetime.utcnow()

    # Update contributor reputation
    sub_stmt = select(Contributor).where(Contributor.id == correction.contributor_id)
    sub_res = await db.execute(sub_stmt)
    submitter = sub_res.scalar_one_or_none()

    if submitter:
        if decision == "approved":
            submitter.verified_submissions_count += 1
            submitter.reputation_score = min(100.0, submitter.reputation_score + 5.0)
        elif decision == "rejected":
            submitter.reputation_score = max(0.0, submitter.reputation_score - 3.0)

        # Recalculate accuracy rate
        total_stmt = select(func.count(ClaimCorrection.id)).where(
            ClaimCorrection.contributor_id == submitter.id,
            ClaimCorrection.status.in_(["approved", "rejected"]),
        )
        total_res = await db.execute(total_stmt)
        total_reviewed = total_res.scalar_one() or 1
        submitter.accuracy_rate = round(submitter.verified_submissions_count / total_reviewed * 100.0, 1)

    await db.commit()

    if decision == "approved":
        await recalculate_claim_verdict_and_composite_score(db, correction.claim_id)

    return correction


async def recalculate_claim_verdict_and_composite_score(
    db: AsyncSession,
    claim_id: uuid.UUID,
) -> None:
    """Feedback Loop: Recalculates claim verdict based on approved community evidence and updates content analysis score."""
    stmt = select(Claim).where(Claim.id == claim_id)
    res = await db.execute(stmt)
    claim = res.scalar_one_or_none()

    if not claim:
        return

    # Fetch all approved corrections for this claim
    corr_stmt = select(ClaimCorrection).where(
        ClaimCorrection.claim_id == claim_id,
        ClaimCorrection.status == "approved",
    )
    corr_res = await db.execute(corr_stmt)
    approved_corrections = corr_res.scalars().all()

    if approved_corrections:
        latest = approved_corrections[-1]
        claim.verdict = latest.proposed_verdict
        claim.confidence_score = min(98.0, max(60.0, claim.confidence_score + 15.0))
        claim.evidence_summary = f"[COMMUNITY VERIFIED] {latest.evidence_text}"

        reasoning = dict(claim.reasoning_chain or {})
        reasoning["community_correction_applied"] = True
        reasoning["approved_correction_id"] = str(latest.id)
        reasoning["evidence_urls"] = latest.evidence_urls
        claim.reasoning_chain = reasoning

        await db.commit()

    # Recompute analysis result for the content item
    content_stmt = select(ContentItem).where(ContentItem.id == claim.content_item_id)
    content_res = await db.execute(content_stmt)
    content_item = content_res.scalar_one_or_none()

    if not content_item:
        return

    claims_stmt = select(Claim).where(Claim.content_item_id == content_item.id)
    claims_res = await db.execute(claims_stmt)
    claims = claims_res.scalars().all()

    result_stmt = select(AnalysisResult).where(AnalysisResult.content_item_id == content_item.id)
    result_res = await db.execute(result_stmt)
    analysis = result_res.scalar_one_or_none()

    source = None
    if content_item.source_id:
        src_stmt = select(Source).where(Source.id == content_item.source_id)
        src_res = await db.execute(src_stmt)
        source = src_res.scalar_one_or_none()

    if analysis:
        score_data = compute_phase3_composite_score(
            source=source,
            claims=claims,
            corroborating_sources=analysis.corroborating_sources or [],
            text_length=len(content_item.raw_payload or ""),
            clickbait_data=analysis.reasoning_chain.get("clickbait_info", {}),
            virality_data={},
            manipulation_data={"manipulation_score": analysis.dimension_scores.get("manipulation_tactics", 0.0), "detected_tactics": analysis.reasoning_chain.get("detected_manipulation_tactics", [])},
            satire_data=analysis.reasoning_chain.get("satire_info", {}),
            temporal_data=analysis.reasoning_chain.get("temporal_info", {}),
        )

        analysis.composite_score = score_data["composite_score"]
        analysis.dimension_scores = score_data["dimension_scores"]
        reasoning = dict(analysis.reasoning_chain or {})
        reasoning["community_feedback_loop_updated"] = True
        analysis.reasoning_chain = reasoning
        await db.commit()
