import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.api.content import _compute_confidence_interval
from app.db.session import get_db
from app.main import app
from app.models.claim import Claim
from app.models.claim_correction import ClaimCorrection
from app.models.content_item import ContentItem
from app.models.user import User
from app.services.source_reputation_service import calculate_source_reputation_score, get_or_create_source


def make_user(email: str, role: str = "user") -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        hashed_password="hashed_pass",
        full_name="Test User",
        role=role,
        is_active=True,
        created_at=datetime.utcnow(),
    )


@pytest.mark.asyncio
async def test_rbac_access_control():
    standard_user = make_user("user@example.com", role="user")
    mock_db = AsyncMock()

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return standard_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    corr_id = uuid.uuid4()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Standard user attempting admin review action should be rejected with 403 Forbidden
        res = await ac.post(f"/api/v1/community/corrections/{corr_id}/review", json={"decision": "approved"})
        assert res.status_code == 403
        assert "Administrative or moderator role required" in res.json()["detail"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_nigerian_source_reputation():
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    source_pt = await get_or_create_source(mock_db, "premiumtimesng.com")
    rep_pt = calculate_source_reputation_score(source_pt)

    assert source_pt.domain == "premiumtimesng.com"
    assert source_pt.historical_accuracy_score == 92.0
    assert rep_pt["label"] == "Verified Publisher"

    source_channels = await get_or_create_source(mock_db, "channelstv.com")
    assert source_channels.historical_accuracy_score == 93.0


@pytest.mark.asyncio
async def test_low_bandwidth_compact_mode():
    from app.models.analysis_result import AnalysisResult
    user = make_user("bot_user@example.com")
    item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,
        modality="text",
        content_hash="hash_compact",
        raw_payload="Nigeria economic growth report",
        status="complete",
        created_at=datetime.utcnow(),
    )
    analysis = AnalysisResult(
        id=uuid.uuid4(),
        content_item_id=item.id,
        composite_score=88.5,
        dimension_scores={},
        reasoning_chain={},
        corroborating_sources=[],
        model_version="v4.0.0-phase4",
        created_at=datetime.utcnow(),
    )

    mock_db = AsyncMock()
    mock_item_res = MagicMock()
    mock_item_res.scalar_one_or_none.return_value = item

    mock_analysis_res = MagicMock()
    mock_analysis_res.scalar_one_or_none.return_value = analysis

    mock_claims_res = MagicMock()
    mock_claims_res.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [mock_item_res, mock_analysis_res, mock_claims_res]

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/content/{item.id}?compact=true")
        assert res.status_code == 200
        data = res.json()
        assert data["low_bandwidth_mode"] is True
        assert data["verdict"] == "VERIFIED"
        assert data["score"] == 88.5
        assert "top_claims" in data

    app.dependency_overrides.clear()


def test_confidence_interval_margin_reason():
    # Single claim
    c1 = Claim(
        id=uuid.uuid4(),
        content_item_id=uuid.uuid4(),
        claim_text="Claim 1",
        verdict="supported",
        confidence_score=85.0,
        evidence_summary="summary",
        reasoning_chain={},
        created_at=datetime.utcnow(),
    )
    ci_single = _compute_confidence_interval(85.0, [c1])
    assert ci_single is not None
    assert "Single claim extracted" in ci_single["margin_reason"]

    # Multiple claims
    c2 = Claim(
        id=uuid.uuid4(),
        content_item_id=uuid.uuid4(),
        claim_text="Claim 2",
        verdict="contradicted",
        confidence_score=30.0,
        evidence_summary="summary",
        reasoning_chain={},
        created_at=datetime.utcnow(),
    )
    ci_multi = _compute_confidence_interval(57.5, [c1, c2])
    assert ci_multi is not None
    assert "Calculated from variance across 2 claims" in ci_multi["margin_reason"]


@pytest.mark.asyncio
async def test_daily_llm_spend_limit_enforcement():
    user = make_user("overbudget@example.com")
    mock_db = AsyncMock()

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    # Mock daily spend check to indicate daily cap ($5.50 / $5.00) exceeded
    with patch("app.api.content.check_daily_llm_spend_limit", return_value=(True, 5.50)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/content", json={"modality": "text", "payload": "Test budget text"})
            assert res.status_code == 429
            assert "Daily LLM spend limit reached" in res.json()["detail"]

    app.dependency_overrides.clear()
