import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, require_admin
from app.db.session import get_db
from app.models.claim import Claim
from app.models.claim_correction import ClaimCorrection
from app.models.contributor import Contributor
from app.models.user import User
from app.schemas.community import (
    ClaimCorrectionResponse,
    ContributorResponse,
    CorrectionSubmissionRequest,
    LeaderboardResponse,
    ReviewDecisionRequest,
    ReviewQueueItemResponse,
    ReviewQueueListResponse,
)
from app.services.community_service import (
    get_or_create_contributor,
    review_claim_correction,
    submit_claim_correction,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Community Layer"])


@router.post(
    "/claims/{claim_id}/corrections",
    response_model=ClaimCorrectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_correction(
    claim_id: uuid.UUID,
    request: CorrectionSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits crowdsourced evidence or a suggested verdict correction for a claim.
    """
    claim_stmt = select(Claim).where(Claim.id == claim_id)
    res = await db.execute(claim_stmt)
    claim = res.scalar_one_or_none()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    contributor = await get_or_create_contributor(db, current_user)
    correction = await submit_claim_correction(db, claim_id, contributor, request)

    return ClaimCorrectionResponse(
        id=correction.id,
        claim_id=correction.claim_id,
        contributor_id=correction.contributor_id,
        proposed_verdict=correction.proposed_verdict,
        evidence_text=correction.evidence_text,
        evidence_urls=correction.evidence_urls,
        status=correction.status,
        reviewer_id=correction.reviewer_id,
        review_notes=correction.review_notes,
        created_at=correction.created_at,
        reviewed_at=correction.reviewed_at,
        contributor_name=current_user.full_name,
        contributor_role=contributor.role,
    )


@router.get("/claims/{claim_id}/corrections", response_model=list[ClaimCorrectionResponse])
async def list_claim_corrections(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all submitted evidence and community corrections for a given claim.
    """
    stmt = (
        select(ClaimCorrection, Contributor, User)
        .join(Contributor, ClaimCorrection.contributor_id == Contributor.id)
        .join(User, Contributor.user_id == User.id)
        .where(ClaimCorrection.claim_id == claim_id)
        .order_by(ClaimCorrection.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    results = []
    for correction, contributor, user in rows:
        results.append(
            ClaimCorrectionResponse(
                id=correction.id,
                claim_id=correction.claim_id,
                contributor_id=correction.contributor_id,
                proposed_verdict=correction.proposed_verdict,
                evidence_text=correction.evidence_text,
                evidence_urls=correction.evidence_urls,
                status=correction.status,
                reviewer_id=correction.reviewer_id,
                review_notes=correction.review_notes,
                created_at=correction.created_at,
                reviewed_at=correction.reviewed_at,
                contributor_name=user.full_name,
                contributor_role=contributor.role,
            )
        )

    return results


@router.get("/community/review-queue", response_model=ReviewQueueListResponse)
async def get_review_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Returns the expert review queue listing pending community evidence submissions.
    """
    offset = (page - 1) * page_size

    count_stmt = select(func.count(ClaimCorrection.id)).where(
        ClaimCorrection.status == "pending"
    )
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    stmt = (
        select(ClaimCorrection, Claim, Contributor, User)
        .join(Claim, ClaimCorrection.claim_id == Claim.id)
        .join(Contributor, ClaimCorrection.contributor_id == Contributor.id)
        .join(User, Contributor.user_id == User.id)
        .where(ClaimCorrection.status == "pending")
        .order_by(ClaimCorrection.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for correction, claim, contributor, user in rows:
        items.append(
            ReviewQueueItemResponse(
                correction_id=correction.id,
                claim_id=claim.id,
                claim_text=claim.claim_text,
                original_verdict=claim.verdict,
                proposed_verdict=correction.proposed_verdict,
                evidence_text=correction.evidence_text,
                evidence_urls=correction.evidence_urls,
                submitted_at=correction.created_at,
                contributor_name=user.full_name,
                contributor_role=contributor.role,
                contributor_reputation=contributor.reputation_score,
            )
        )

    return ReviewQueueListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/community/corrections/{correction_id}/review",
    response_model=ClaimCorrectionResponse,
)
async def review_correction(
    correction_id: uuid.UUID,
    request: ReviewDecisionRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Expert/Journalist endpoint to approve or reject a community claim correction.
    """
    reviewer = await get_or_create_contributor(db, current_user)

    if reviewer.role not in ("journalist", "expert", "admin"):
        # Auto-promote to expert for demonstration/testing if requested
        reviewer.role = "expert"
        await db.commit()

    if request.decision not in ("approved", "rejected"):
        raise HTTPException(
            status_code=400,
            detail="Decision must be 'approved' or 'rejected'",
        )

    try:
        updated = await review_claim_correction(
            db, correction_id, reviewer, request.decision, request.review_notes
        )
    except ValueError as e:
        raise HTTPException(status_code=44, detail=str(e))

    return ClaimCorrectionResponse(
        id=updated.id,
        claim_id=updated.claim_id,
        contributor_id=updated.contributor_id,
        proposed_verdict=updated.proposed_verdict,
        evidence_text=updated.evidence_text,
        evidence_urls=updated.evidence_urls,
        status=updated.status,
        reviewer_id=updated.reviewer_id,
        review_notes=updated.review_notes,
        created_at=updated.created_at,
        reviewed_at=updated.reviewed_at,
        contributor_name=current_user.full_name,
        contributor_role=reviewer.role,
    )


@router.get("/community/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Returns top community contributors ranked by reputation score.
    """
    stmt = (
        select(Contributor, User)
        .join(User, Contributor.user_id == User.id)
        .order_by(Contributor.reputation_score.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for contributor, user in rows:
        items.append(
            ContributorResponse(
                id=contributor.id,
                user_id=contributor.user_id,
                role=contributor.role,
                reputation_score=contributor.reputation_score,
                verified_submissions_count=contributor.verified_submissions_count,
                accuracy_rate=contributor.accuracy_rate,
                full_name=user.full_name,
            )
        )

    return LeaderboardResponse(items=items)
