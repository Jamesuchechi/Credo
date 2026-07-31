import pytest
from unittest.mock import AsyncMock, patch

from app.services.social_ingestion_service import (
    SocialPostData,
    fetch_reddit_post,
    fetch_x_post,
    ingest_social_post,
    search_reddit_posts,
)


@pytest.mark.asyncio
async def test_fetch_x_post_mock():
    mock_x_response = AsyncMock()
    mock_x_response.status_code = 200
    mock_x_response.text = """{
        "data": {
            "id": "123456789",
            "text": "Breaking news: Major scientific breakthrough announced today in renewable energy.",
            "created_at": "2026-07-31T10:00:00Z",
            "public_metrics": {
                "like_count": 1500,
                "retweet_count": 300,
                "reply_count": 45,
                "quote_count": 12,
                "bookmark_count": 80
            }
        },
        "includes": {
            "users": [
                {
                    "id": "987654321",
                    "username": "science_daily",
                    "name": "Science Daily News",
                    "verified": true,
                    "created_at": "2018-05-12T00:00:00Z",
                    "public_metrics": {
                        "followers_count": 450000
                    }
                }
            ]
        }
    }"""
    mock_x_response.raise_for_status = lambda: None

    with patch("app.services.social_ingestion_service.settings") as mock_settings:
        mock_settings.X_API_BEARER_TOKEN = "valid_test_token_xyz"

        with patch("app.services.social_ingestion_service.safe_fetch_url", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = mock_x_response

            post = await fetch_x_post("https://x.com/science_daily/status/123456789")

            assert post.platform == "x"
            assert post.author_handle == "science_daily"
            assert post.author_display_name == "Science Daily News"
            assert post.author_verified is True
            assert post.author_follower_count == 450000
            assert "renewable energy" in post.post_text
            assert post.engagement["likes"] == 1500


@pytest.mark.asyncio
async def test_fetch_reddit_post_mock():
    mock_reddit_response = AsyncMock()
    mock_reddit_response.status_code = 200
    mock_reddit_response.text = """[
        {
            "data": {
                "children": [
                    {
                        "data": {
                            "title": "New solar cell achieves 35% efficiency in lab tests",
                            "selftext": "Researchers at National Renewable Lab published findings today.",
                            "author": "energy_researcher",
                            "score": 4200,
                            "upvote_ratio": 0.95,
                            "num_comments": 230,
                            "created_utc": 1785500000,
                            "url": "https://www.reddit.com/r/science/comments/abc1234/new_solar_cell/"
                        }
                    }
                ]
            }
        }
    ]"""
    mock_reddit_response.raise_for_status = lambda: None

    with patch("app.services.social_ingestion_service.safe_fetch_url", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_reddit_response

        post = await fetch_reddit_post("https://www.reddit.com/r/science/comments/abc1234/new_solar_cell/")

        assert post.platform == "reddit"
        assert post.author_handle == "energy_researcher"
        assert "35% efficiency" in post.post_text
        assert post.engagement["score"] == 4200


@pytest.mark.asyncio
async def test_search_reddit_posts_mock():
    mock_reddit_response = AsyncMock()
    mock_reddit_response.status_code = 200
    mock_reddit_response.text = """{
        "data": {
            "children": [
                {
                    "data": {
                        "title": "Donald Trump in LA for event",
                        "selftext": "Discussion thread on the news.",
                        "author": "la_news_reporter",
                        "score": 1500,
                        "upvote_ratio": 0.90,
                        "num_comments": 450,
                        "created_utc": 1785500000,
                        "permalink": "/r/news/comments/xyz987/donald_trump_la/",
                        "subreddit": "news"
                    }
                }
            ]
        }
    }"""
    mock_reddit_response.raise_for_status = lambda: None

    with patch("app.services.social_ingestion_service.safe_fetch_url", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_reddit_response

        results = await search_reddit_posts("Donald trump is in LA", limit=5)

        assert len(results) == 1
        assert results[0].platform == "reddit"
        assert results[0].author_handle == "la_news_reporter"
        assert results[0].engagement["subreddit"] == "news"
        assert results[0].engagement["score"] == 1500

