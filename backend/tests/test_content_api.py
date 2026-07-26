import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.analysis_result import AnalysisResult
from app.models.content_item import ContentItem
from app.models.user import User


def make_mock_user():
    return User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        hashed_password="dummy",
        full_name="Test User",
        is_active=True,
        created_at=datetime.utcnow()
    )


async def mock_get_current_user(
    token: str = pytest.approx(None), db: AsyncMock = None
) -> User:
    return make_mock_user()


@pytest.mark.asyncio
async def test_submit_content_and_get():
    fake_id = uuid.uuid4()
    fake_user = make_mock_user()
    fake_item = ContentItem(
        id=fake_id,
        user_id=fake_user.id,
        modality="text",
        content_hash="abc123hash",
        raw_payload="Engineers inspect newly constructed bridge after inaugural crossing.",
        status="queued",
        created_at=datetime.utcnow()
    )
    fake_analysis = AnalysisResult(
        id=uuid.uuid4(),
        content_item_id=fake_id,
        composite_score=85.0,
        dimension_scores={"factual_accuracy": 90.0, "source_reputation": 80.0},
        reasoning_chain={"summary": "Mock analysis"},
        corroborating_sources=[],
        model_version="v1.0.0-phase1",
        created_at=datetime.utcnow()
    )

    mock_db = AsyncMock()

    # Mock execute result
    mock_res_none = MagicMock()
    mock_res_none.scalar_one_or_none.return_value = None

    mock_res_item = MagicMock()
    mock_res_item.scalar_one_or_none.return_value = fake_item

    mock_res_analysis = MagicMock()
    mock_res_analysis.scalar_one_or_none.return_value = fake_analysis

    mock_res_claims = MagicMock()
    mock_res_claims.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [mock_res_none, mock_res_item, mock_res_analysis, mock_res_claims]

    async def override_get_db():
        yield mock_db

    async def override_current_user():
        return fake_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user

    with patch("app.api.content.process_content_item", new_callable=AsyncMock) as mock_worker:
        mock_worker.return_value = True

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Submit Content
            payload = {"modality": "text", "payload": "Engineers inspect newly constructed bridge after inaugural crossing."}
            res = await ac.post("/api/v1/content", json=payload)
            assert res.status_code == 202
            data = res.json()
            assert "content_id" in data
            assert data["status"] == "queued"

            content_id = data["content_id"]

            # 2. Get Analysis
            res_get = await ac.get(f"/api/v1/content/{content_id}")
            assert res_get.status_code == 200
            get_data = res_get.json()
            assert get_data["modality"] == "text"
            assert get_data["composite_score"] == 85.0

    app.dependency_overrides.clear()
