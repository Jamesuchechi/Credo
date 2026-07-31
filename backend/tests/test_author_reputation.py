import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.social_author import SocialAuthor
from app.services.author_reputation_service import (
    calculate_author_reputation_score,
    get_or_create_social_author,
)


@pytest.mark.asyncio
async def test_get_or_create_social_author():
    mock_db = AsyncMock()

    mock_res_none = MagicMock()
    mock_res_none.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res_none

    author = await get_or_create_social_author(
        mock_db,
        platform="x",
        handle="news_reporter",
        display_name="News Reporter",
        verified=True,
        follower_count=50000,
    )

    assert author.platform == "x"
    assert author.handle == "news_reporter"
    assert author.verified is True
    assert author.follower_count == 50000


@pytest.mark.asyncio
async def test_calculate_author_reputation_score():
    mock_db = AsyncMock()

    # Mock content items IDs
    mock_res_items = MagicMock()
    mock_res_items.scalars.return_value.all.return_value = [uuid.uuid4(), uuid.uuid4()]

    # Mock claims summary
    mock_res_claims = MagicMock()
    mock_res_claims.all.return_value = [("supported", 4), ("contradicted", 1)]

    mock_db.execute.side_effect = [mock_res_items, mock_res_claims]

    author = SocialAuthor(
        id=uuid.uuid4(),
        platform="x",
        handle="fact_checker",
        display_name="Fact Checker",
        verified=True,
        follower_count=120000,
        account_created_at=datetime(2020, 1, 1),
    )

    score_data = await calculate_author_reputation_score(mock_db, author)

    assert score_data["platform"] == "x"
    assert score_data["handle"] == "fact_checker"
    assert score_data["verified"] is True
    assert score_data["reputation_score"] > 70.0
    assert score_data["total_claims_analyzed"] == 5
