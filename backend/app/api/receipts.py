import uuid
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.receipt import ReceiptResponse, ReceiptVerificationResponse
from app.services.receipt_service import (
    get_receipt_by_slug,
    issue_receipt,
    verify_receipt_signature,
)

router = APIRouter(tags=["Credibility Receipts"])


@router.post("/content/{content_id}/receipt", response_model=ReceiptResponse)
async def create_or_get_receipt(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Issues a cryptographically signed point-in-time credibility receipt for an analyzed content item.
    """
    try:
        receipt = await issue_receipt(db, content_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    is_valid = verify_receipt_signature(receipt)
    public_url = f"/receipts/{receipt.public_slug}"
    verification_url = f"/receipts/{receipt.public_slug}/verify"

    return ReceiptResponse(
        public_slug=receipt.public_slug,
        issued_at=receipt.issued_at,
        verdict_summary=receipt.verdict_summary,
        signature=receipt.signature,
        is_valid_signature=is_valid,
        public_url=public_url,
        verification_page_url=verification_url,
    )


@router.get("/receipts/{public_slug}", response_model=ReceiptResponse)
async def get_public_receipt(
    public_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public no-auth endpoint to inspect a signed credibility receipt.
    Excludes all user PII, submitter details, and raw payload text.
    """
    receipt = await get_receipt_by_slug(db, public_slug)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credibility receipt not found",
        )

    is_valid = verify_receipt_signature(receipt)
    public_url = f"/receipts/{receipt.public_slug}"
    verification_url = f"/receipts/{receipt.public_slug}/verify"

    return ReceiptResponse(
        public_slug=receipt.public_slug,
        issued_at=receipt.issued_at,
        verdict_summary=receipt.verdict_summary,
        signature=receipt.signature,
        is_valid_signature=is_valid,
        public_url=public_url,
        verification_page_url=verification_url,
    )


@router.get("/receipts/{public_slug}/verify", response_model=ReceiptVerificationResponse)
async def verify_public_receipt_endpoint(
    public_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Cryptographically verifies the authenticity and non-tampering signature of a public receipt.
    """
    receipt = await get_receipt_by_slug(db, public_slug)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credibility receipt not found",
        )

    is_valid = verify_receipt_signature(receipt)
    return ReceiptVerificationResponse(
        public_slug=receipt.public_slug,
        is_valid_signature=is_valid,
        signature=receipt.signature,
        issued_at=receipt.issued_at,
        verdict_summary=receipt.verdict_summary,
        message="Signature verified authentic. No tampering detected." if is_valid else "INVALID SIGNATURE! Data tampering detected.",
    )


@router.get("/receipts/{public_slug}/embed.js")
async def get_receipt_embed_js(
    public_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a JavaScript oEmbed widget script for publishers to drop onto their websites.
    """
    receipt = await get_receipt_by_slug(db, public_slug)
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    score = receipt.verdict_summary.get("composite_score", 0)
    label = receipt.verdict_summary.get("verdict_label", "VERIFIED")
    claims_count = receipt.verdict_summary.get("claims_count", 0)

    color = "#10b981" if score >= 80 else ("#f59e0b" if score >= 60 else "#ef4444")

    js_code = f"""(function() {{
  const container = document.currentScript.parentNode;
  const widget = document.createElement('div');
  widget.style.cssText = 'display:inline-flex;align-items:center;gap:10px;padding:8px 14px;background:#18181b;border:1px solid #27272a;border-radius:8px;font-family:sans-serif;color:#f4f4f5;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  widget.innerHTML = `
    <div style="width:10px;height:10px;border-radius:50%;background:{color};box-shadow:0 0 8px {color};"></div>
    <div>
      <div style="font-weight:700;font-size:12px;letter-spacing:0.05em;color:#a1a1aa;">CREDO VERIFIED RECEIPT</div>
      <div style="font-weight:600;color:#f4f4f5;">{label} <span style="color:{color};">({score}/100)</span> · {claims_count} Claims</div>
    </div>
    <a href="/analysis/{receipt.content_item_id}" target="_blank" style="margin-left:8px;color:#818cf8;text-decoration:none;font-size:12px;font-weight:600;">View Report &rarr;</a>
  `;
  container.appendChild(widget);
}})();"""

    return Response(
        content=js_code,
        media_type="application/javascript",
        headers={"X-Frame-Options": "ALLOWALL", "Access-Control-Allow-Origin": "*"},
    )


@router.get("/receipts/{public_slug}/badge.svg")
async def get_receipt_badge_svg(
    public_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a dynamic SVG badge for markdown/HTML embeds.
    """
    receipt = await get_receipt_by_slug(db, public_slug)
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    score = receipt.verdict_summary.get("composite_score", 0)
    label = receipt.verdict_summary.get("verdict_label", "VERIFIED")
    color = "#10b981" if score >= 80 else ("#f59e0b" if score >= 60 else "#ef4444")

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="280" height="36" viewBox="0 0 280 36">
  <rect width="280" height="36" rx="8" fill="#18181b" stroke="#27272a" stroke-width="1"/>
  <circle cx="20" cy="18" r="5" fill="{color}"/>
  <text x="34" y="16" fill="#a1a1aa" font-size="9" font-family="system-ui, sans-serif" font-weight="700" letter-spacing="1">CREDO SIGNED RECEIPT</text>
  <text x="34" y="27" fill="#f4f4f5" font-size="11" font-family="system-ui, sans-serif" font-weight="600">{label} ({score}/100)</text>
  <path d="M260 14 l4 4 -4 4" stroke="#818cf8" stroke-width="1.5" fill="none"/>
</svg>"""

    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={"X-Frame-Options": "ALLOWALL", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600"},
    )
