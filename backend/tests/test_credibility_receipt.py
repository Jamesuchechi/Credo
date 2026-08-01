import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.analysis_result import AnalysisResult
from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.models.credibility_receipt import CredibilityReceipt
from app.models.user import User
from app.services.receipt_service import (
    compute_receipt_signature,
    generate_public_slug,
    issue_receipt,
    verify_receipt_signature,
)


def make_test_user():
    return User(
        id=uuid.uuid4(),
        email="receipt_tester@example.com",
        hashed_password="hashed_pass",
        full_name="Receipt Tester",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.mark.asyncio
async def test_issue_and_verify_credibility_receipt_logic():
    item_id = uuid.uuid4()
    user_id = uuid.uuid4()

    fake_item = ContentItem(
        id=item_id,
        user_id=user_id,
        modality="url",
        url="https://example.com/article-receipt-test",
        title="Scientific Breakthrough Article",
        status="complete",
        created_at=datetime.now(timezone.utc),
    )

    fake_analysis = AnalysisResult(
        id=uuid.uuid4(),
        content_item_id=item_id,
        composite_score=88.5,
        dimension_scores={"factual_accuracy": 90, "source_reputation": 87},
        reasoning_chain={"summary": "Corroborated by academic research."},
        corroborating_sources=[{"title": "Peer Reviewed Paper", "url": "https://nature.com"}],
        model_version="v1.0",
        created_at=datetime.now(timezone.utc),
    )

    fake_claim = Claim(
        id=uuid.uuid4(),
        content_item_id=item_id,
        claim_text="Lab achieved 35% efficiency in solar cell testing.",
        verdict="supported",
        confidence_score=94.0,
        evidence_summary="Corroborated by independent lab measurements.",
        created_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock()

    async def mock_execute(stmt, *args, **kwargs):
        stmt_str = str(stmt).lower()
        mock_res = MagicMock()
        if "credibility_receipts" in stmt_str:
            mock_res.scalar_one_or_none.return_value = None
        elif "analysis_results" in stmt_str:
            mock_res.scalar_one_or_none.return_value = fake_analysis
        elif "content_items" in stmt_str:
            mock_res.scalar_one_or_none.return_value = fake_item
        elif "claims" in stmt_str:
            mock_res.scalars().all.return_value = [fake_claim]
        else:
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalars().all.return_value = []
        return mock_res

    mock_db.execute.side_effect = mock_execute

    # Issue receipt
    receipt = await issue_receipt(mock_db, item_id)

    assert isinstance(receipt, CredibilityReceipt)
    assert receipt.content_item_id == item_id
    assert 8 <= len(receipt.public_slug) <= 16
    assert receipt.verdict_summary["composite_score"] == 88.5
    assert receipt.verdict_summary["verdict_label"] == "HIGHLY CREDIBLE"
    assert receipt.verdict_summary["claims_count"] == 1

    # Verify signature logic
    assert verify_receipt_signature(receipt) is True


@pytest.mark.asyncio
async def test_tampered_receipt_signature_fails():
    item_id = uuid.uuid4()
    public_slug = generate_public_slug()
    issued_at = datetime.now(timezone.utc)
    summary = {
        "composite_score": 45.0,
        "verdict_label": "LOW CREDIBILITY / DISPUTED",
        "claims_count": 2,
    }

    import json
    summary_json = json.dumps(summary, sort_keys=True)
    issued_iso = issued_at.isoformat()
    signature = compute_receipt_signature(public_slug, str(item_id), issued_iso, summary_json)

    receipt = CredibilityReceipt(
        id=uuid.uuid4(),
        content_item_id=item_id,
        public_slug=public_slug,
        verdict_summary=summary,
        signature=signature,
        issued_at=issued_at,
    )

    assert verify_receipt_signature(receipt) is True

    # Tamper with summary payload
    receipt.verdict_summary["composite_score"] = 99.0
    receipt.verdict_summary["verdict_label"] = "HIGHLY CREDIBLE"

    # Cryptographic verification MUST fail
    assert verify_receipt_signature(receipt) is False


@pytest.mark.asyncio
async def test_receipt_api_routes():
    test_user = make_test_user()
    item_id = uuid.uuid4()
    slug = "testslug1234"
    issued_at = datetime.now(timezone.utc)

    verdict_summary = {
        "composite_score": 85.0,
        "verdict_label": "HIGHLY CREDIBLE",
        "claims_count": 1,
    }
    import json
    summary_json = json.dumps(verdict_summary, sort_keys=True)
    signature = compute_receipt_signature(slug, str(item_id), issued_at.isoformat(), summary_json)

    fake_receipt = CredibilityReceipt(
        id=uuid.uuid4(),
        content_item_id=item_id,
        public_slug=slug,
        verdict_summary=verdict_summary,
        signature=signature,
        issued_at=issued_at,
    )

    async def mock_user_override():
        return test_user

    async def mock_db_override():
        db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = fake_receipt
        db.execute.return_value = mock_res
        yield db

    app.dependency_overrides[get_current_user] = mock_user_override
    app.dependency_overrides[get_db] = mock_db_override

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Fetch public receipt (No-Auth)
            res = await ac.get(f"/api/v1/receipts/{slug}")
            assert res.status_code == 200
            data = res.json()
            assert data["public_slug"] == slug
            assert data["is_valid_signature"] is True
            assert "user_id" not in data

            # 2. Verify endpoint
            res_verify = await ac.get(f"/api/v1/receipts/{slug}/verify")
            assert res_verify.status_code == 200
            assert res_verify.json()["is_valid_signature"] is True

            # 3. Embed JS script
            res_js = await ac.get(f"/api/v1/receipts/{slug}/embed.js")
            assert res_js.status_code == 200
            assert "application/javascript" in res_js.headers["content-type"]
            assert "CREDO VERIFIED RECEIPT" in res_js.text

            # 4. Badge SVG image
            res_svg = await ac.get(f"/api/v1/receipts/{slug}/badge.svg")
            assert res_svg.status_code == 200
            assert "image/svg+xml" in res_svg.headers["content-type"]
            assert "<svg" in res_svg.text
    finally:
        app.dependency_overrides.clear()
