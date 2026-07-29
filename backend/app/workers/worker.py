import hashlib
import json
import logging
import uuid

from arq.connections import RedisSettings
from redis.asyncio import Redis as AsyncRedis
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


def _progress_key(content_id: str) -> str:
    return f"progress:{content_id}"


async def set_progress(redis: AsyncRedis, content_id: str, phase: str, message: str) -> None:
    await redis.set(
        _progress_key(content_id),
        json.dumps({"phase": phase, "message": message}),
        ex=3600,
    )


async def _preprocess_modality(item: ContentItem, redis_client: AsyncRedis, content_id_str: str) -> tuple[str, str | None]:
    """Route payload through the appropriate Phase 4 pre-processor.

    Returns (extracted_text, domain).
    """
    modality = item.modality
    raw = item.raw_payload

    if modality == "url" or raw.startswith(("http://", "https://")):
        url = item.url or raw.strip()
        await set_progress(redis_client, content_id_str, "extracting", "Extracting article content and checking domain WHOIS")
        extraction = await extract_article_content(url)
        extracted_text = extraction["text"] if extraction["success"] else raw
        if extraction["success"]:
            item.title = extraction["title"]
            item.extracted_text = extracted_text
        domain = extract_domain(url)
        return extracted_text, domain

    if modality == "text":
        await set_progress(redis_client, content_id_str, "preprocessing", "Preparing text for analysis")
        return raw, None

    if modality in ("image", "screenshot"):
        await set_progress(redis_client, content_id_str, "ocr", "Extracting text from image via OCR & analyzing provenance")
        from app.services.c2pa_provenance import extract_c2pa_provenance
        from app.services.deepfake_screener import screen_deepfake_artifacts
        from app.services.media_preprocessor import fetch_image_bytes
        from app.services.ocr_service import extract_text_from_image
        from app.services.vlm_alignment import check_vlm_alignment

        image_bytes = await fetch_image_bytes(raw)
        extracted_text = ""
        if image_bytes:
            extracted_text = await extract_text_from_image(image_bytes)
            c2pa_info = extract_c2pa_provenance(media_bytes=image_bytes)
            vlm_info = check_vlm_alignment(image_bytes=image_bytes, caption=extracted_text)
            deepfake_info = screen_deepfake_artifacts(media_bytes=image_bytes)
            logger.info(f"Phase 4 media checks complete: C2PA={c2pa_info['has_c2pa_manifest']}, VLM={vlm_info['is_mismatched']}, Deepfake={deepfake_info['is_suspicious']}")

        item.extracted_text = extracted_text
        return extracted_text or raw, None

    if modality in ("video", "audio"):
        await set_progress(redis_client, content_id_str, "transcribing", "Transcribing media content & screening deepfakes")
        from app.services.deepfake_screener import screen_deepfake_artifacts
        from app.services.media_transcription import transcribe_media

        extracted_text = await transcribe_media(raw)
        deepfake_info = screen_deepfake_artifacts(media_path=raw)
        logger.info(f"Phase 4 audio/video checks complete: Deepfake={deepfake_info['is_suspicious']}")

        item.extracted_text = extracted_text
        return extracted_text or raw, None

    if modality == "social_post":
        await set_progress(redis_client, content_id_str, "parsing", "Parsing social media post")
        from app.services.social_post_parser import parse_social_post
        parsed = parse_social_post(raw)
        extracted_text = parsed.get("text", raw)
        item.title = parsed.get("title")
        item.extracted_text = extracted_text
        return extracted_text, parsed.get("domain")

    await set_progress(redis_client, content_id_str, "preprocessing", "Preparing content for analysis")
    return raw, None


async def process_content_item(ctx: dict, content_id_str: str) -> bool:
    """
    ARQ Background Worker Task (Phase 3 + Phase 4):
    1. Routes payload through modality-specific pre-processor (OCR, transcription, social parser, etc.)
    2. Redacts PII before external API calls and storage.
    3. Runs Satire detection, Clickbait scoring & Manipulation tactics detection.
    4. Runs LLM claim extraction & prompt injection defense.
    5. Verifies each extracted claim independently.
    6. Computes composite credibility score and saves DB records.
    """
    logger.info(f"Worker starting processing for ContentItem: {content_id_str}")

    redis_client = await AsyncRedis.from_url(settings.REDIS_URL)

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
            extracted_text, domain = await _preprocess_modality(item, redis_client, content_id_str)

            from app.services.pii_redactor import redact_pii
            extracted_text = redact_pii(extracted_text)

            # Source Reputation & WHOIS Age
            source = None
            if domain:
                source = await get_or_create_source(session, domain)
                item.source_id = source.id

            # Satire Detection Check
            await set_progress(redis_client, content_id_str, "satire-check", "Running satire and source reputation analysis")
            satire_res = detect_satire(extracted_text, domain=domain)

            # Clickbait & Virality Scoring
            await set_progress(redis_client, content_id_str, "linguistic", "Analyzing linguistic patterns and virality risk")
            clickbait_res = analyze_clickbait_and_sensationalism(extracted_text)
            virality_res = analyze_virality_risk(extracted_text)

            # Manipulation Tactics Detection
            await set_progress(redis_client, content_id_str, "manipulation", "Detecting manipulation tactics")
            manipulation_res = detect_manipulation_tactics(extracted_text)

            # LLM Claim Extraction & Defense Shield
            await set_progress(redis_client, content_id_str, "claim-extraction", "Extracting factual claims from content")
            extracted_claims = await extract_claims_from_text(extracted_text)

            # Per-Claim Corroboration & Verification
            await set_progress(redis_client, content_id_str, "claim-verification", f"Verifying {len(extracted_claims)} extracted claims")
            verified_claims = []
            for claim_item in extracted_claims:
                claim_obj = await verify_and_create_claim(session, item.id, claim_item)
                verified_claims.append(claim_obj)

            # Global Corroboration fallback
            await set_progress(redis_client, content_id_str, "corroboration", "Cross-referencing against independent sources")
            global_references = await get_corroborating_sources(extracted_text[:120])

            # Temporal Mismatch Check
            await set_progress(redis_client, content_id_str, "temporal", "Checking for temporal inconsistencies")
            temporal_res = detect_temporal_mismatch(extracted_text, global_references)

            # Composite Scoring
            await set_progress(redis_client, content_id_str, "scoring", "Computing composite credibility score")
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

            await set_progress(redis_client, content_id_str, "complete", "Analysis complete")
            logger.info(f"ContentItem {content_id} analysis complete. Score: {score_data['composite_score']}")
            return True

        except Exception as e:
            logger.error(f"Error processing ContentItem {content_id}: {e!s}", exc_info=True)
            item.status = "failed"
            await session.commit()
            await set_progress(redis_client, content_id_str, "failed", f"Analysis failed: {e!s}")
            return False
        finally:
            await redis_client.close()


from app.db.init_db import init_db


async def startup(ctx: dict):
    logger.info("ARQ Worker starting up...")
    await init_db()


async def shutdown(ctx: dict):
    logger.info("ARQ Worker shutting down...")


class WorkerSettings:
    functions = [process_content_item]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
