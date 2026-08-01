import hmac
import hashlib
import json
import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.analysis_result import AnalysisResult
from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.models.credibility_receipt import CredibilityReceipt

logger = logging.getLogger(__name__)


def _determine_verdict_label(score: float | None) -> str:
    if score is None:
        return "UNVERIFIED"
    if score >= 80:
        return "HIGHLY CREDIBLE"
    if score >= 60:
        return "MODERATE CREDIBILITY"
    return "LOW CREDIBILITY / DISPUTED"


def generate_public_slug() -> str:
    return secrets.token_urlsafe(9).replace("-", "").replace("_", "")[:12]


def compute_receipt_signature(
    public_slug: str,
    content_item_id: str,
    issued_at_iso: str,
    summary_json: str,
) -> str:
    """
    Computes a cryptographic HMAC-SHA256 signature for receipt authenticity verification.
    """
    key = settings.RECEIPT_SIGNING_KEY.encode("utf-8")
    message = f"{public_slug}:{content_item_id}:{issued_at_iso}:{summary_json}".encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def verify_receipt_signature(receipt: CredibilityReceipt) -> bool:
    """
    Verifies that the receipt signature matches the stored verdict_summary payload and slug.
    """
    if not receipt or not receipt.signature:
        return False

    summary_str = json.dumps(receipt.verdict_summary, sort_keys=True)
    issued_iso = (
        receipt.issued_at.isoformat()
        if isinstance(receipt.issued_at, datetime)
        else str(receipt.issued_at)
    )

    expected = compute_receipt_signature(
        public_slug=receipt.public_slug,
        content_item_id=str(receipt.content_item_id),
        issued_at_iso=issued_iso,
        summary_json=summary_str,
    )
    return hmac.compare_digest(expected, receipt.signature)


async def get_receipt_by_slug(db: AsyncSession, public_slug: str) -> CredibilityReceipt | None:
    stmt = select(CredibilityReceipt).where(CredibilityReceipt.public_slug == public_slug)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_receipt_by_content_id(db: AsyncSession, content_item_id: uuid.UUID) -> CredibilityReceipt | None:
    stmt = select(CredibilityReceipt).where(CredibilityReceipt.content_item_id == content_item_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def issue_receipt(db: AsyncSession, content_item_id: uuid.UUID) -> CredibilityReceipt:
    """
    Issues a point-in-time signed credibility receipt for a completed ContentItem analysis.
    If a receipt already exists for this content item, returns the existing receipt.
    """
    # Check if receipt already issued
    existing = await get_receipt_by_content_id(db, content_item_id)
    if existing:
        return existing

    item_stmt = select(ContentItem).where(ContentItem.id == content_item_id)
    item_res = await db.execute(item_stmt)
    item = item_res.scalar_one_or_none()

    if not item:
        raise ValueError(f"ContentItem {content_item_id} not found")

    analysis_stmt = select(AnalysisResult).where(AnalysisResult.content_item_id == content_item_id)
    analysis_res = await db.execute(analysis_stmt)
    analysis = analysis_res.scalar_one_or_none()

    if not analysis or item.status != "complete":
        raise ValueError(f"Analysis for item {content_item_id} is not complete")

    claims_stmt = select(Claim).where(Claim.content_item_id == content_item_id)
    claims_res = await db.execute(claims_stmt)
    db_claims = claims_res.scalars().all()

    verdict_label = _determine_verdict_label(analysis.composite_score)
    supported_cnt = sum(1 for c in db_claims if c.verdict == "supported")
    contradicted_cnt = sum(1 for c in db_claims if c.verdict == "contradicted")
    unverified_cnt = len(db_claims) - (supported_cnt + contradicted_cnt)

    verdict_summary: dict[str, Any] = {
        "composite_score": round(analysis.composite_score, 1) if analysis.composite_score is not None else 0.0,
        "verdict_label": verdict_label,
        "claims_count": len(db_claims),
        "supported_claims": supported_cnt,
        "contradicted_claims": contradicted_cnt,
        "unverified_claims": unverified_cnt,
        "corroboration_percentage": round((supported_cnt / max(1, len(db_claims))) * 100, 1),
        "dimension_scores": analysis.dimension_scores or {},
        "model_version": analysis.model_version or "v1.0",
        "snapshot_notice": "Point-in-time verification receipt issued by Credo Engine. Verdicts reflect evidence at time of issue.",
    }

    public_slug = generate_public_slug()
    issued_at = datetime.now(timezone.utc)
    summary_str = json.dumps(verdict_summary, sort_keys=True)
    issued_iso = issued_at.isoformat()

    signature = compute_receipt_signature(
        public_slug=public_slug,
        content_item_id=str(content_item_id),
        issued_at_iso=issued_iso,
        summary_json=summary_str,
    )

    receipt = CredibilityReceipt(
        id=uuid.uuid4(),
        content_item_id=content_item_id,
        public_slug=public_slug,
        verdict_summary=verdict_summary,
        signature=signature,
        issued_at=issued_at,
    )

    db.add(receipt)
    await db.commit()
    await db.refresh(receipt)
    return receipt
