import pytest
from unittest.mock import AsyncMock, patch

from app.services.social_echo_service import gather_social_echoes
from app.services.social_ingestion_service import SocialPostData, search_x_posts, search_reddit_posts


@pytest.mark.asyncio
async def test_gather_social_echoes_combines_x_and_reddit():
    mock_reddit_data = [
        SocialPostData(
            platform="reddit",
            author_handle="reddit_user_1",
            author_display_name="u/reddit_user_1",
            author_verified=False,
            post_text="Breaking: Discussion on Donald Trump visit in LA.",
            post_created_at=None,
            media_urls=["https://reddit.com/r/news/comments/123/"],
            engagement={"score": 850, "num_comments": 120, "subreddit": "news"},
        )
    ]

    mock_x_data = [
        SocialPostData(
            platform="x",
            author_handle="x_news_account",
            author_display_name="X News Daily",
            author_verified=True,
            post_text="Confirmed: Donald Trump arrives in LA for campaign rally.",
            post_created_at=None,
            media_urls=["https://x.com/x_news_account/status/987654"],
            engagement={"likes": 4500, "reposts": 890, "impression_count": 250000},
        )
    ]

    with patch("app.services.social_echo_service.search_reddit_posts", new_callable=AsyncMock) as mock_reddit_search:
        with patch("app.services.social_echo_service.search_x_posts", new_callable=AsyncMock) as mock_x_search:
            mock_reddit_search.return_value = mock_reddit_data
            mock_x_search.return_value = mock_x_data

            echoes = await gather_social_echoes("Donald Trump is in LA", limit=5)

            assert len(echoes) == 2
            
            platforms = {e["platform"] for e in echoes}
            assert "x" in platforms
            assert "reddit" in platforms

            x_echo = next(e for e in echoes if e["platform"] == "x")
            assert x_echo["author_handle"] == "@x_news_account"
            assert x_echo["is_verified"] is True
            assert "250.0K Impressions" in x_echo["reach_impressions"] or "Impressions" in x_echo["reach_impressions"]

            reddit_echo = next(e for e in echoes if e["platform"] == "reddit")
            assert reddit_echo["author_handle"] == "u/reddit_user_1"
            assert "850 Upvotes" in reddit_echo["reach_impressions"]
