import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.cited_source import CitedSource, ContentItemCitedSource
from app.models.content_item import ContentItem
from app.models.user import User
from app.services.retraction_watchdog_service import (
    compute_text_hash,
    detect_retraction_keyword,
    recheck_cited_source_record,
    register_cited_sources,
)


def make_test_user():
    return User(
        id=uuid.uuid4(),
        email="watchdog_tester@example.com",
        hashed_password="hashed_pass",
        full_name="Watchdog Tester",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


def test_detect_retraction_keyword_logic():
    assert detect_retraction_keyword("Notice: A formal RETRACTION has been issued for this paper.") == "retraction"
    assert detect_retraction_keyword("Editor's Note: The dataset in this report was updated.") == "editor's note"
    assert detect_retraction_keyword("Normal scientific article content without keywords.") is None


@pytest.mark.asyncio
async def test_recheck_source_detects_retraction_and_flags_item():
    item_id = uuid.uuid4()
    source_url = "https://journal.example.com/paper1"

    fake_item = ContentItem(
        id=item_id,
        user_id=uuid.uuid4(),
        modality="url",
        raw_payload="test payload",
        content_hash="hash123",
        status="complete",
        has_flagged_source_update=False,
    )

    fake_source = CitedSource(
        id=uuid.uuid4(),
        source_url=source_url,
        content_hash_at_citation=compute_text_hash("Original article content"),
        first_cited_at=datetime.now(timezone.utc),
        last_checked_at=datetime.now(timezone.utc),
        status="active",
    )

    mock_db = AsyncMock()

    # Query linked content_item_ids
    mock_res_links = MagicMock()
    mock_res_links.scalars().all.return_value = [item_id]
    mock_db.execute.return_value = mock_res_links

    mock_http_res = MagicMock()
    mock_http_res.status_code = 200
    mock_http_res.text = "RETRACTION NOTICE: This article has been retracted due to data error."

    with patch("app.services.retraction_watchdog_service.safe_fetch_url", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_http_res

        changed = await recheck_cited_source_record(mock_db, fake_source)

        assert changed is True
        assert fake_source.status == "retracted"
        assert "Retraction notice detected" in fake_source.update_notes


@pytest.mark.asyncio
async def test_recheck_source_detects_404_removal():
    item_id = uuid.uuid4()
    source_url = "https://journal.example.com/removed_paper"

    fake_source = CitedSource(
        id=uuid.uuid4(),
        source_url=source_url,
        content_hash_at_citation=compute_text_hash("Original article text"),
        first_cited_at=datetime.now(timezone.utc),
        last_checked_at=datetime.now(timezone.utc),
        status="active",
    )

    mock_db = AsyncMock()
    mock_res_links = MagicMock()
    mock_res_links.scalars().all.return_value = [item_id]
    mock_db.execute.return_value = mock_res_links

    mock_http_res = MagicMock()
    mock_http_res.status_code = 404
    mock_http_res.text = "404 Not Found"

    with patch("app.services.retraction_watchdog_service.safe_fetch_url", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_http_res

        changed = await recheck_cited_source_record(mock_db, fake_source)

        assert changed is True
        assert fake_source.status == "404_removed"
        assert "404" in fake_source.update_notes


@pytest.mark.asyncio
async def test_recheck_sources_on_demand_api():
    test_user = make_test_user()
    item_id = uuid.uuid4()

    fake_item = ContentItem(
        id=item_id,
        user_id=test_user.id,
        modality="url",
        raw_payload="test",
        content_hash="hash",
        status="complete",
        has_flagged_source_update=True,
        source_update_notice="A source was retracted",
    )

    async def mock_user_override():
        return test_user

    async def mock_db_override():
        db = AsyncMock()
        mock_res_item = MagicMock()
        mock_res_item.scalar_one_or_none.return_value = fake_item
        mock_res_empty = MagicMock()
        mock_res_empty.scalars().all.return_value = []
        db.execute.side_effect = [mock_res_item, mock_res_empty, mock_res_empty]
        yield db

    app.dependency_overrides[get_current_user] = mock_user_override
    app.dependency_overrides[get_db] = mock_db_override

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(f"/api/v1/content/{item_id}/recheck-sources")
            assert res.status_code == 200
            data = res.json()
            assert data["content_id"] == str(item_id)
            assert data["has_flagged_source_update"] is True
            assert "summary" in data
    finally:
        app.dependency_overrides.clear()
