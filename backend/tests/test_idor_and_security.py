import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.content_item import ContentItem
from app.models.user import User
from app.services.c2pa_provenance import extract_c2pa_provenance
from app.services.deepfake_screener import screen_deepfake_artifacts
from app.services.vlm_alignment import check_vlm_alignment


def make_user(email: str) -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        hashed_password="hashed_pass",
        full_name="User",
        is_active=True,
        created_at=datetime.utcnow(),
    )


@pytest.mark.asyncio
async def test_content_idor_isolation():
    user_a = make_user("user_a@example.com")
    user_b = make_user("user_b@example.com")

    # Item owned by User A
    item_a = ContentItem(
        id=uuid.uuid4(),
        user_id=user_a.id,
        modality="text",
        content_hash="hash_a",
        raw_payload="User A private content",
        status="complete",
        created_at=datetime.utcnow(),
    )

    mock_db = AsyncMock()
    # When User B requests Item A, DB query scoped by user_id returns None
    mock_res_none = MagicMock()
    mock_res_none.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res_none

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return user_b

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/content/{item_a.id}")
        assert res.status_code == 404
        assert res.json()["detail"] == "Content item not found"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_batch_submission_cap():
    user = make_user("batch_user@example.com")
    mock_db = AsyncMock()

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    # Submit batch exceeding 20 items (21 items)
    items = [{"modality": "text", "payload": f"Item {i}"} for i in range(21)]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/content/batch", json={"items": items})
        assert res.status_code == 400
        assert "Batch size limit exceeded" in res.json()["detail"]

    app.dependency_overrides.clear()


def test_c2pa_manifest_detection():
    fake_c2pa_bytes = b"HEADER_DATA_URN:C2PA_MANIFEST_CONTENT"
    res = extract_c2pa_provenance(media_bytes=fake_c2pa_bytes)
    assert res["has_c2pa_manifest"] is True
    assert len(res["provenance"]) > 0


def test_deepfake_artifact_screening():
    fake_ai_bytes = b"PNG_IMAGE_STABLE DIFFUSION_GENERATED_PROMPT"
    res = screen_deepfake_artifacts(media_bytes=fake_ai_bytes)
    assert res["is_suspicious"] is True
    assert res["confidence"] >= 0.8


def test_vlm_alignment():
    with patch("app.services.vlm_alignment.settings.OPENROUTER_API_KEY", ""):
        res = check_vlm_alignment(image_bytes=b"fake_image", caption="Normal headline description")
        assert res["is_mismatched"] is False
        assert res["alignment_score"] >= 80.0
