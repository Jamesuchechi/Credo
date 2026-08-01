import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.claim import Claim
from app.models.user import User
from app.services.claim_verifier import (
    run_advocate_pass,
    run_debate_mode_verification,
    run_skeptic_pass,
    synthesize_debate_verdict,
)


def make_test_user():
    return User(
        id=uuid.uuid4(),
        email="debate_tester@example.com",
        hashed_password="hashed_pass",
        full_name="Debate Tester",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


def test_advocate_and_skeptic_passes():
    claim_text = "New solar panel reaches 35% efficiency"
    evidence_supported = [
        {"title": "Peer-reviewed paper verifies solar efficiency", "url": "https://example.com/paper"}
    ]
    evidence_contradicted = [
        {"title": "Fact Check: Debunked solar efficiency claim", "textual_rating": "false"}
    ]

    adv_res = run_advocate_pass(claim_text, evidence_supported)
    assert adv_res["role"] == "advocate"
    assert adv_res["proposed_verdict"] == "supported"
    assert adv_res["confidence_score"] > 70.0

    skep_res = run_skeptic_pass(claim_text, evidence_contradicted)
    assert skep_res["role"] == "skeptic"
    assert skep_res["proposed_verdict"] == "contradicted"
    assert skep_res["confidence_score"] > 70.0


def test_synthesize_debate_verdict_order_bias_invariance():
    claim_text = "Headline test statement"
    evidence = [
        {"title": "Debunked claim statement", "textual_rating": "false"}
    ]

    # Standard order (Advocate first, Skeptic second)
    adv_1 = run_advocate_pass(claim_text, evidence)
    skep_1 = run_skeptic_pass(claim_text, evidence)
    synth_1 = synthesize_debate_verdict(adv_1, skep_1, claim_text, swap_order=False)

    # Swapped order (Skeptic first, Advocate second)
    skep_2 = run_skeptic_pass(claim_text, evidence)
    adv_2 = run_advocate_pass(claim_text, evidence)
    synth_2 = synthesize_debate_verdict(adv_2, skep_2, claim_text, swap_order=True)

    # ORDER BIAS INVARIANCE CHECK: Final verdict MUST remain identical regardless of evaluation order!
    assert synth_1["final_verdict"] == synth_2["final_verdict"]
    assert synth_1["final_verdict"] == "contradicted"


@pytest.mark.asyncio
async def test_daily_spend_limit_exceeded_blocks_debate():
    test_user = make_test_user()
    claim_id = uuid.uuid4()

    mock_db = AsyncMock()

    # Mock check_daily_llm_spend_limit to return True (exceeded)
    with patch("app.services.claim_verifier.check_daily_llm_spend_limit", new_callable=AsyncMock) as mock_check:
        mock_check.return_value = (True, 5.50)

        with pytest.raises(HTTPException) as exc_info:
            await run_debate_mode_verification(mock_db, test_user.id, claim_id)

        assert exc_info.value.status_code == 402
        assert "spend limit" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_trigger_claim_debate_api_endpoint():
    test_user = make_test_user()
    claim_id = uuid.uuid4()

    fake_claim = Claim(
        id=claim_id,
        content_item_id=uuid.uuid4(),
        claim_text="Solar test claim",
        verdict="supported",
        confidence_score=85.0,
        reasoning_chain={},
        created_at=datetime.now(timezone.utc),
    )

    async def mock_user_override():
        return test_user

    async def mock_db_override():
        db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = fake_claim
        db.execute.return_value = mock_res
        yield db

    app.dependency_overrides[get_current_user] = mock_user_override
    app.dependency_overrides[get_db] = mock_db_override

    try:
        with patch("app.services.claim_verifier.check_daily_llm_spend_limit", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = (False, 0.50)

            with patch("app.services.claim_verifier.record_llm_spend", new_callable=AsyncMock) as mock_record:
                mock_record.return_value = 0.56

                with patch("app.services.claim_verifier.get_corroborating_sources", new_callable=AsyncMock) as mock_sources:
                    mock_sources.return_value = []

                    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                        res = await ac.post(f"/api/v1/claims/{claim_id}/debate")
                        assert res.status_code == 200
                        data = res.json()
                        assert data["claim_id"] == str(claim_id)
                        assert "debate_transcript" in data
                        assert "advocate" in data["debate_transcript"]
                        assert "skeptic" in data["debate_transcript"]
                        assert "synthesis" in data["debate_transcript"]
    finally:
        app.dependency_overrides.clear()
