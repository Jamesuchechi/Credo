import asyncio
import hashlib
import json
import logging
import uuid
from typing import Any
from urllib.parse import urlparse

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from fastapi.responses import StreamingResponse
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.analysis_result import AnalysisResult
from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.models.user import User
from app.schemas.claim import ClaimResponse
from app.schemas.content import (
    ContentAnalysisResponse,
    ContentItemSummary,
    ContentListResponse,
    ContentSubmissionRequest,
    CredibilityCardResponse,
    ModelVersionChangelogResponse,
    ModelVersionEntry,
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


def _compute_confidence_interval(composite_score: float | None, claims: list[Any]) -> dict[str, float] | None:
    if composite_score is None:
        return None
    if claims:
        import statistics
        claim_scores_for_ci = []
        for c in claims:
            if c.verdict == "supported":
                claim_scores_for_ci.append(c.confidence_score)
            elif c.verdict == "contradicted":
                claim_scores_for_ci.append(100.0 - c.confidence_score)
            else:
                claim_scores_for_ci.append(45.0)
        if len(claim_scores_for_ci) > 1:
            std_dev = statistics.stdev(claim_scores_for_ci)
            margin = min(12.0, max(3.0, std_dev / (len(claim_scores_for_ci) ** 0.5)))
        else:
            margin = 8.0
    else:
        margin = 10.0
    return {
        "lower": round(max(0.0, composite_score - margin), 1),
        "upper": round(min(100.0, composite_score + margin), 1),
        "margin": round(margin, 1),
    }


@router.post("/content", response_model=SubmissionResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_content(
    request: ContentSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
        user_id=current_user.id,
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
            confidence_interval=_compute_confidence_interval(analysis.composite_score if analysis else None, db_claims),
            evidence_summary=c.evidence_summary,
            reasoning_chain=c.reasoning_chain,
            created_at=c.created_at,
            ttl_expires_at=c.ttl_expires_at
        )
        for c in db_claims
    ]

    confidence_interval = _compute_confidence_interval(analysis.composite_score if analysis else None, db_claims)

    return ContentAnalysisResponse(
        content_id=item.id,
        modality=item.modality,
        url=item.url,
        title=item.title,
        status=item.status,
        composite_score=analysis.composite_score if analysis else None,
        confidence_interval=confidence_interval,
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


@router.get("/content", response_model=ContentListResponse)
async def list_content(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Returns a paginated list of the current user's content items with
    their latest analysis results, ordered most recent first.
    """
    offset = (page - 1) * page_size

    base_stmt = select(ContentItem).where(
        ContentItem.user_id == current_user.id
    ).order_by(ContentItem.created_at.desc())

    count_stmt = select(func.count(ContentItem.id)).where(
        ContentItem.user_id == current_user.id
    )

    item_stmt = base_stmt.offset(offset).limit(page_size)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    items_res = await db.execute(item_stmt)
    items = items_res.scalars().all()

    summaries = []
    for item in items:
        result_stmt = select(AnalysisResult).where(
            AnalysisResult.content_item_id == item.id
        ).order_by(AnalysisResult.created_at.desc())
        result_res = await db.execute(result_stmt)
        analysis = result_res.scalar_one_or_none()

        claims_count_stmt = select(func.count(Claim.id)).where(
            Claim.content_item_id == item.id
        )
        claims_count_res = await db.execute(claims_count_stmt)
        claims_count = claims_count_res.scalar_one()

        verdict = None
        if analysis and analysis.composite_score is not None:
            if analysis.composite_score >= 60:
                verdict = "verified"
            elif analysis.composite_score >= 30:
                verdict = "mixed"
            else:
                verdict = "disputed"

        source_domain = None
        if item.url:
            parsed = urlparse(item.url)
            source_domain = parsed.netloc or None

        summaries.append(
            ContentItemSummary(
                id=item.id,
                title=item.title,
                raw_payload=item.raw_payload,
                source_domain=source_domain,
                status=item.status,
                verdict=verdict,
                claims_count=claims_count,
                composite_score=analysis.composite_score if analysis else None,
                created_at=item.created_at,
            )
        )

    return ContentListResponse(
        items=summaries,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/content/{content_id}/stream")
async def stream_analysis_progress(
    content_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SSE endpoint that streams analysis progress updates for a content item.
    """
    item_stmt = select(ContentItem).where(
        ContentItem.id == content_id,
    )
    item_res = await db.execute(item_stmt)
    item = item_res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    async def event_generator():
        redis_client = None
        try:
            redis_client = await AsyncRedis.from_url(settings.REDIS_URL)

            # Check if already complete
            result_stmt = select(AnalysisResult).where(
                AnalysisResult.content_item_id == content_id
            )
            result_res = await db.execute(result_stmt)
            analysis = result_res.scalar_one_or_none()

            if analysis:
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
                        confidence_interval=_compute_confidence_interval(analysis.composite_score, db_claims),
                        evidence_summary=c.evidence_summary,
                        reasoning_chain=c.reasoning_chain,
                        created_at=c.created_at,
                        ttl_expires_at=c.ttl_expires_at,
                    )
                    for c in db_claims
                ]
                confidence_interval = _compute_confidence_interval(analysis.composite_score, db_claims)
                result_data = ContentAnalysisResponse(
                    content_id=item.id,
                    modality=item.modality,
                    url=item.url,
                    title=item.title,
                    status=item.status,
                    composite_score=analysis.composite_score,
                    confidence_interval=confidence_interval,
                    dimension_scores=analysis.dimension_scores,
                    reasoning_chain=analysis.reasoning_chain,
                    corroborating_sources=analysis.corroborating_sources,
                    claims=claims_list,
                    model_version=analysis.model_version,
                    created_at=item.created_at,
                )
                yield f"data: {result_data.model_dump(mode='json')}\n\n"
                return

            yield f"data: {json.dumps({'phase': 'queued', 'message': 'Analysis queued'})}\n\n"

            # Stream progress until complete or failed
            for _ in range(60):
                await asyncio.sleep(2)

                progress_raw = await redis_client.get(f"progress:{content_id}")
                if progress_raw:
                    progress = json.loads(progress_raw)
                    yield f"data: {json.dumps(progress)}\n\n"

                status_stmt = select(ContentItem).where(ContentItem.id == content_id)
                status_res = await db.execute(status_stmt)
                current_item = status_res.scalar_one_or_none()

                if current_item and current_item.status == "complete":
                    result_stmt = select(AnalysisResult).where(
                        AnalysisResult.content_item_id == content_id
                    )
                    result_res = await db.execute(result_stmt)
                    analysis = result_res.scalar_one_or_none()

                    if analysis:
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
                                confidence_interval=_compute_confidence_interval(analysis.composite_score, db_claims),
                                evidence_summary=c.evidence_summary,
                                reasoning_chain=c.reasoning_chain,
                                created_at=c.created_at,
                                ttl_expires_at=c.ttl_expires_at,
                            )
                            for c in db_claims
                        ]
                        confidence_interval = _compute_confidence_interval(analysis.composite_score, db_claims)
                        result_data = ContentAnalysisResponse(
                            content_id=item.id,
                            modality=item.modality,
                            url=item.url,
                            title=item.title,
                            status=item.status,
                            composite_score=analysis.composite_score,
                            confidence_interval=confidence_interval,
                            dimension_scores=analysis.dimension_scores,
                            reasoning_chain=analysis.reasoning_chain,
                            corroborating_sources=analysis.corroborating_sources,
                            claims=claims_list,
                            model_version=analysis.model_version,
                            created_at=item.created_at,
                        )
                        yield f"data: {result_data.model_dump(mode='json')}\n\n"
                    return

                if current_item and current_item.status == "failed":
                    yield f"data: {json.dumps({'phase': 'failed', 'message': 'Analysis failed'})}\n\n"
                    return

            yield f"data: {json.dumps({'phase': 'timeout', 'message': 'Analysis is taking longer than expected'})}\n\n"
        finally:
            if redis_client:
                await redis_client.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/model-versions/changelog", response_model=ModelVersionChangelogResponse)
async def get_model_version_changelog():
    """
    Returns history of scoring model versions and feature updates.
    """
    return ModelVersionChangelogResponse(
        current_version="v3.0.0-phase3",
        entries=[
            ModelVersionEntry(
                version="v3.0.0-phase3",
                date="2026-07-29",
                title="Phase 3: Stylometrics, Manipulation Tactics & Virality Risk",
                changes=[
                    "Integrated in-house stylometric clickbait and sensationalism classifier.",
                    "Added rhetorical manipulation tactics detector (appeal to fear, false dichotomy, cherry picking).",
                    "Surfaced satire and parody classification to suppress false misinfo flags.",
                    "Added temporal mismatch detector cross-referencing claim dates with source timestamps.",
                    "Added virality spread risk scoring based on structural & emotional features."
                ]
            ),
            ModelVersionEntry(
                version="v2.0.0-phase2",
                date="2026-07-25",
                title="Phase 2: Claim-Level Extraction & Multi-Source Corroboration",
                changes=[
                    "Integrated OpenRouter LLM claim extraction with Pydantic JSON Schema guards.",
                    "Implemented per-claim independent corroboration routing.",
                    "Added claim verification status logic (supported / contradicted / unverified) with confidence intervals.",
                    "Introduced TTL and decay tracking on claim verification records."
                ]
            ),
            ModelVersionEntry(
                version="v1.0.0-phase1",
                date="2026-07-20",
                title="Phase 1: Source Reputation & Baseline Corroboration MVP",
                changes=[
                    "Seeded domain source reputation database from public datasets.",
                    "Integrated WHOIS domain age lookup service.",
                    "Added Google Fact Check Tools API and News API corroboration aggregators.",
                    "Added Redis semantic caching for URL deduplication."
                ]
            )
        ]
    )



@router.get("/content/{content_id}/card", response_model=CredibilityCardResponse)
async def get_credibility_card(
    content_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ContentItem).where(
        ContentItem.id == content_id,
        ContentItem.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    result_stmt = select(AnalysisResult).where(AnalysisResult.content_item_id == content_id)
    result_res = await db.execute(result_stmt)
    analysis = result_res.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not yet complete")

    claims_stmt = select(Claim).where(Claim.content_item_id == content_id)
    claims_res = await db.execute(claims_stmt)
    db_claims = claims_res.scalars().all()

    confidence_interval = _compute_confidence_interval(analysis.composite_score, db_claims)

    verdict = None
    if analysis.composite_score is not None:
        if analysis.composite_score >= 60:
            verdict = "verified"
        elif analysis.composite_score >= 30:
            verdict = "mixed"
        else:
            verdict = "disputed"

    source_domain = None
    if item.url:
        source_domain = urlparse(item.url).netloc or None

    return CredibilityCardResponse(
        content_id=item.id,
        title=item.title,
        composite_score=analysis.composite_score,
        confidence_interval=confidence_interval,
        dimension_scores=analysis.dimension_scores,
        verdict=verdict,
        claims_count=len(db_claims),
        model_version=analysis.model_version,
        created_at=item.created_at,
        source_domain=source_domain,
    )


class BatchSubmissionRequest(BaseModel):
    items: list[ContentSubmissionRequest]


@router.post("/content/batch", status_code=status.HTTP_202_ACCEPTED)
async def submit_content_batch(
    request: BatchSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a batch of content items (chat thread / forwarded message chain)
    for per-message credibility verification.
    """
    queued_ids = []
    for item_req in request.items:
        sub_res = await submit_content(item_req, current_user=current_user, db=db)
        queued_ids.append(sub_res.content_id)

    return {
        "status": "queued",
        "total_items": len(queued_ids),
        "content_ids": queued_ids,
        "message": f"Successfully queued {len(queued_ids)} items for thread credibility analysis."
    }