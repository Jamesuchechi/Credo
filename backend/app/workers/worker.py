import logging
import uuid

from arq.connections import RedisSettings
from sqlalchemy import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.analysis_result import AnalysisResult
from app.models.content_item import ContentItem
from app.services.article_extractor import extract_article_content
from app.services.claim_extractor import extract_claims_from_text
from app.services.claim_verifier import verify_and_create_claim
from app.services.corroboration.corroboration_service import get_corroborating_sources
from app.services.linguistic_scorer import (
    analyze_clickbait_and_sensationalism,
    analyze_virality_risk,
)
from app.services.manipulation_detector import detect_manipulation_tactics
from app.services.satire_detector import detect_satire
from app.services.scoring_service import compute_phase3_composite_score
from app.services.source_reputation_service import get_or_create_source
from app.services.temporal_detector import detect_temporal_mismatch
from app.services.whois_service import extract_domain

logger = logging.getLogger(__name__)


async def process_content_item(ctx: dict, content_id_str: str) -> bool:
    """
    ARQ Background Worker Task (Phase 3):
    1. Extracts raw text / article body from URL or payload.
    2. Runs Satire detection, Clickbait scoring & Manipulation tactics detection.
    3. Runs LLM claim extraction & prompt injection defense.
    4. Verifies each extracted claim independently.
    5. Computes Phase 3 composite credibility score (v3.0.0-phase3) and saves DB records.
    """
    logger.info(f"Worker starting Phase 3 processing for ContentItem: {content_id_str}")

    try:
        content_id = uuid.UUID(content_id_str)
    except ValueError:
        logger.error(f"Invalid UUID string passed to worker: {content_id_str}")
        return False

    async with AsyncSessionLocal() as session:
        stmt = select(ContentItem).where(ContentItem.id == content_id)
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()

        if not item:
            logger.error(f"ContentItem {content_id} not found in database")
            return False

        item.status = "processing"
        await session.commit()

        try:
            extracted_text = item.raw_payload
            domain = None

            # Article Extraction & WHOIS Lookup if URL
            if item.modality == "url" or item.raw_payload.startswith(("http://", "https://")):
                url = item.url or item.raw_payload.strip()
                extraction = await extract_article_content(url)
                if extraction["success"]:
                    extracted_text = extraction["text"]
                    item.title = extraction["title"]
                    item.extracted_text = extracted_text
                domain = extract_domain(url)

            # Source Reputation & WHOIS Age
            source = None
            if domain:
                source = await get_or_create_source(session, domain)
                item.source_id = source.id

            # Phase 3: Satire Detection Check
            satire_res = detect_satire(extracted_text, domain=domain)

            # Phase 3: Clickbait & Virality Scoring
            clickbait_res = analyze_clickbait_and_sensationalism(extracted_text)
            virality_res = analyze_virality_risk(extracted_text)

            # Phase 3: Manipulation Tactics Detection
            manipulation_res = detect_manipulation_tactics(extracted_text)

            # Phase 2: LLM Claim Extraction & Defense Shield
            extracted_claims = await extract_claims_from_text(extracted_text)

            # Per-Claim Corroboration & Verification
            verified_claims = []
            for claim_item in extracted_claims:
                claim_obj = await verify_and_create_claim(session, item.id, claim_item)
                verified_claims.append(claim_obj)

            # Global Corroboration fallback
            global_references = await get_corroborating_sources(extracted_text[:120])

            # Phase 3: Temporal Mismatch Check
            temporal_res = detect_temporal_mismatch(extracted_text, global_references)

            # Phase 3 Composite Scoring
            score_data = compute_phase3_composite_score(
                source=source,
                claims=verified_claims,
                corroborating_sources=global_references,
                text_length=len(extracted_text),
                clickbait_data=clickbait_res,
                virality_data=virality_res,
                manipulation_data=manipulation_res,
                satire_data=satire_res,
                temporal_data=temporal_res
            )

            # Save Analysis Result
            analysis = AnalysisResult(
                id=uuid.uuid4(),
                content_item_id=item.id,
                composite_score=score_data["composite_score"],
                dimension_scores=score_data["dimension_scores"],
                reasoning_chain=score_data["reasoning_chain"],
                corroborating_sources=global_references[:5],
                model_version="v3.0.0-phase3"
            )
            session.add(analysis)

            item.status = "complete"
            await session.commit()

            logger.info(f"ContentItem {content_id} Phase 3 analysis complete. Score: {score_data['composite_score']}")
            return True

        except Exception as e:
            logger.error(f"Error processing ContentItem {content_id}: {e!s}", exc_info=True)
            item.status = "failed"
            await session.commit()
            return False


async def startup(ctx: dict):
    logger.info("ARQ Worker starting up...")


async def shutdown(ctx: dict):
    logger.info("ARQ Worker shutting down...")


class WorkerSettings:
    functions = [process_content_item]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
