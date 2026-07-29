import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.claim import Claim
from app.models.claim_correction import ClaimCorrection
from app.models.contributor import Contributor
from app.models.user import User


def make_test_user():
    return User(
        id=uuid.uuid4(),
        email="community_tester@credo.app",
        hashed_password="dummy",
        full_name="Community Tester",
        is_active=True,
        created_at=datetime.utcnow(),
    )


@pytest.mark.asyncio
async def test_phase6_community_endpoints():
    fake_user = make_test_user()
    fake_claim_id = uuid.uuid4()
    fake_claim = Claim(
        id=fake_claim_id,
        content_item_id=uuid.uuid4(),
        claim_text="Sample claim text for testing",
        verdict="contradicted",
        confidence_score=85.0,
        evidence_summary="Initial evidence",
        created_at=datetime.utcnow(),
    )
    fake_contributor = Contributor(
        id=uuid.uuid4(),
        user_id=fake_user.id,
        role="expert",
        reputation_score=75.0,
        verified_submissions_count=5,
        accuracy_rate=90.0,
        created_at=datetime.utcnow(),
    )
    fake_correction = ClaimCorrection(
        id=uuid.uuid4(),
        claim_id=fake_claim_id,
        contributor_id=fake_contributor.id,
        proposed_verdict="contradicted",
        evidence_text="Verified NASA reference data",
        evidence_urls=["https://nasa.gov/reference"],
        status="pending",
        created_at=datetime.utcnow(),
    )

    mock_db = AsyncMock()

    # Mock DB query responses
    mock_res_claim = MagicMock()
    mock_res_claim.scalar_one_or_none.return_value = fake_claim

    mock_res_contributor = MagicMock()
    mock_res_contributor.scalar_one_or_none.return_value = fake_contributor

    mock_res_corrections_list = MagicMock()
    mock_res_corrections_list.all.return_value = [(fake_correction, fake_contributor, fake_user)]

    mock_res_count = MagicMock()
    mock_res_count.scalar_one.return_value = 1

    mock_res_queue = MagicMock()
    mock_res_queue.all.return_value = [(fake_correction, fake_claim, fake_contributor, fake_user)]

    mock_res_correction = MagicMock()
    mock_res_correction.scalar_one_or_none.return_value = fake_correction

    mock_res_leaderboard = MagicMock()
    mock_res_leaderboard.all.return_value = [(fake_contributor, fake_user)]

    def mock_res_none():
        m = MagicMock()
        m.scalar_one_or_none.return_value = None
        m.scalars.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = [
        mock_res_claim,            # submit_correction: find claim
        mock_res_contributor,      # submit_correction: find contributor
        mock_res_corrections_list, # list_claim_corrections
        mock_res_count,            # get_review_queue: count
        mock_res_queue,            # get_review_queue: fetch rows
        mock_res_contributor,      # review_correction: find reviewer
        mock_res_correction,       # review_correction: find correction
        mock_res_contributor,      # review_correction: find submitter
        mock_res_count,            # review_correction: count total reviewed
        mock_res_claim,            # recalculate: find claim
        mock_res_corrections_list, # recalculate: find approved corrections
        mock_res_none(),           # recalculate: find content item (None mock)
        mock_res_leaderboard,      # leaderboard
    ]

    async def override_get_db():
        yield mock_db

    async def override_current_user():
        return fake_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Submit claim correction
        sub_res = await ac.post(
            f"/api/v1/claims/{fake_claim_id}/corrections",
            json={
                "proposed_verdict": "contradicted",
                "evidence_text": "Verified NASA reference data",
                "evidence_urls": ["https://nasa.gov/reference"],
            },
        )
        assert sub_res.status_code == 201
        assert sub_res.json()["proposed_verdict"] == "contradicted"

        # 2. List claim corrections
        list_res = await ac.get(f"/api/v1/claims/{fake_claim_id}/corrections")
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1

        # 3. Get review queue
        queue_res = await ac.get("/api/v1/community/review-queue")
        assert queue_res.status_code == 200
        assert queue_res.json()["total"] == 1

        # 4. Review correction (approve)
        rev_res = await ac.post(
            f"/api/v1/community/corrections/{fake_correction.id}/review",
            json={"decision": "approved", "review_notes": "Looks solid"},
        )
        assert rev_res.status_code == 200
        assert rev_res.json()["status"] == "approved"

        # 5. Leaderboard
        lead_res = await ac.get("/api/v1/community/leaderboard")
        assert lead_res.status_code == 200
        assert len(lead_res.json()["items"]) == 1

    app.dependency_overrides.clear()
