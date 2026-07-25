import hashlib
import logging
import uuid

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.analysis_result import AnalysisResult
from app.models.content_item import ContentItem
from app.schemas.content import (
    ContentAnalysisResponse,
    ContentSubmissionRequest,
    SubmissionResponse,
)
from app.schemas.source import SourceResponse
from app.services.source_reputation_service import (
    calculate_source_reputation_score,
    get_or_create_source,
)
from app.workers.worker import process_content_item

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Content & Verification"])


def generate_content_hash(payload: str) -> str:
    return hashlib.sha256(payload.strip().encode("utf-8")).hexdigest()


@router.post("/content", response_model=SubmissionResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_content(
    request: ContentSubmissionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a Content Item (URL or raw text) for credibility analysis.
    Deduplicates via Redis / content_hash and dispatches to background ARQ worker.
    """
    content_hash = generate_content_hash(request.payload)
    url_val = request.payload if request.modality == "url" else None

    # Check for existing duplicate content item
    stmt = select(ContentItem).where(ContentItem.content_hash == content_hash)
    result = await db.execute(stmt)
    existing_item = result.scalar_one_or_none()

    if existing_item:
        logger.info(f"Deduplicated existing ContentItem {existing_item.id}")
        return SubmissionResponse(
            content_id=existing_item.id,
            status=existing_item.status,
            message="Content item already exists; returning existing analysis token."
        )

    # Create new ContentItem
    new_item = ContentItem(
        id=uuid.uuid4(),
        modality=request.modality,
        content_hash=content_hash,
        url=url_val,
        raw_payload=request.payload,
        status="queued"
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    # Dispatch to ARQ task worker or inline fallback
    try:
        arq_redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        await arq_redis.enqueue_job("process_content_item", str(new_item.id))
    except Exception as e:
        logger.warning(f"Could not enqueue ARQ job, running inline: {e!s}")
        # Inline fallback execution
        await process_content_item({}, str(new_item.id))

    return SubmissionResponse(
        content_id=new_item.id,
        status="queued",
        message="Content queued for multi-modal credibility analysis."
    )


@router.get("/content/{content_id}", response_model=ContentAnalysisResponse)
async def get_content_analysis(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the current status and detailed multi-dimensional score breakdown for a Content Item.
    """
    stmt = select(ContentItem).where(ContentItem.id == content_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    # Fetch associated AnalysisResult if complete
    result_stmt = select(AnalysisResult).where(AnalysisResult.content_item_id == content_id)
    result_res = await db.execute(result_stmt)
    analysis = result_res.scalar_one_or_none()

    # Fetch associated Claims
    from app.models.claim import Claim
    from app.schemas.claim import ClaimResponse
    claims_stmt = select(Claim).where(Claim.content_item_id == content_id)
    claims_res = await db.execute(claims_stmt)
    db_claims = claims_res.scalars().all()

    claims_list = [
        ClaimResponse(
            id=c.id,
            content_item_id=c.content_item_id,
            claim_text=c.claim_text,
            extracted_speaker=c.extracted_speaker,
            verdict=c.verdict,
            confidence_score=c.confidence_score,
            evidence_summary=c.evidence_summary,
            reasoning_chain=c.reasoning_chain,
            created_at=c.created_at,
            ttl_expires_at=c.ttl_expires_at
        )
        for c in db_claims
    ]

    return ContentAnalysisResponse(
        content_id=item.id,
        modality=item.modality,
        url=item.url,
        title=item.title,
        status=item.status,
        composite_score=analysis.composite_score if analysis else None,
        dimension_scores=analysis.dimension_scores if analysis else None,
        reasoning_chain=analysis.reasoning_chain if analysis else None,
        corroborating_sources=analysis.corroborating_sources if analysis else None,
        claims=claims_list,
        model_version=analysis.model_version if analysis else None,
        created_at=item.created_at
    )


@router.get("/sources/{domain}", response_model=SourceResponse)
async def get_source_reputation(
    domain: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves reputation rating, domain age, and historical accuracy for a domain.
    """
    source = await get_or_create_source(db, domain)
    rep_info = calculate_source_reputation_score(source)

    return SourceResponse(
        id=source.id,
        domain=source.domain,
        name=source.name,
        historical_accuracy_score=source.historical_accuracy_score,
        bias_rating=source.bias_rating,
        whois_age_days=source.whois_age_days,
        is_known_satire=source.is_known_satire,
        is_known_misinfo=source.is_known_misinfo,
        label=rep_info["label"]
    )
