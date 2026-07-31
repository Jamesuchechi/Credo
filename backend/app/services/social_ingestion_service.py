import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

from app.core.config import settings
from app.core.safe_http import safe_fetch_url
from app.services.social_post_parser import _detect_platform, parse_social_post

logger = logging.getLogger(__name__)


@dataclass
class SocialPostData:
    platform: str
    author_handle: str
    author_display_name: str | None = None
    author_verified: bool = False
    author_follower_count: int | None = None
    author_account_created_at: datetime | None = None
    post_text: str = ""
    post_created_at: datetime | None = None
    media_urls: list[str] = field(default_factory=list)
    parent_post_url: str | None = None
    engagement: dict[str, Any] = field(default_factory=dict)


def _parse_iso_datetime(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        dt_str = dt_str.replace("Z", "+00:00")
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None


async def fetch_x_post(url: str) -> SocialPostData:
    """Fetch post and author metadata from X (Twitter) API v2."""
    tweet_id_match = re.search(r"/status/(\d+)", url)
    if not tweet_id_match:
        raise ValueError(f"Could not extract tweet ID from URL: {url}")

    tweet_id = tweet_id_match.group(1)
    if not settings.X_API_BEARER_TOKEN or settings.X_API_BEARER_TOKEN.startswith("your_"):
        raise ValueError("X_API_BEARER_TOKEN is not configured")

    endpoint = (
        f"https://api.twitter.com/2/tweets/{tweet_id}"
        "?expansions=author_id,referenced_tweets.id"
        "&tweet.fields=created_at,public_metrics,entities,attachments"
        "&user.fields=created_at,public_metrics,verified,name,username"
    )

    headers = {
        "Authorization": f"Bearer {settings.X_API_BEARER_TOKEN}",
        "User-Agent": "CredoVerificationEngine/1.0",
    }

    res = await safe_fetch_url(endpoint, headers=headers, timeout=10.0)
    res.raise_for_status()

    import json
    payload = json.loads(res.text)

    if "data" not in payload:
        raise ValueError(f"X API response missing data object: {payload}")

    tweet_data = payload["data"]
    includes = payload.get("includes", {})
    users = includes.get("users", [])
    author_info = users[0] if users else {}

    author_metrics = author_info.get("public_metrics", {})
    tweet_metrics = tweet_data.get("public_metrics", {})

    parent_url = None
    ref_tweets = tweet_data.get("referenced_tweets", [])
    if ref_tweets:
        ref_id = ref_tweets[0].get("id")
        if ref_id:
            parent_url = f"https://x.com/i/status/{ref_id}"

    media_urls = []
    entities = tweet_data.get("entities", {})
    urls_entity = entities.get("urls", [])
    for u in urls_entity:
        expanded = u.get("expanded_url")
        if expanded and any(domain in expanded.lower() for domain in ("pic.twitter.com", "pbs.twimg.com", "instagram", "youtube")):
            media_urls.append(expanded)

    return SocialPostData(
        platform="x",
        author_handle=author_info.get("username", "unknown"),
        author_display_name=author_info.get("name"),
        author_verified=bool(author_info.get("verified", False)),
        author_follower_count=author_metrics.get("followers_count"),
        author_account_created_at=_parse_iso_datetime(author_info.get("created_at")),
        post_text=tweet_data.get("text", ""),
        post_created_at=_parse_iso_datetime(tweet_data.get("created_at")),
        media_urls=media_urls,
        parent_post_url=parent_url,
        engagement={
            "likes": tweet_metrics.get("like_count", 0),
            "reposts": tweet_metrics.get("retweet_count", 0),
            "replies": tweet_metrics.get("reply_count", 0),
            "quotes": tweet_metrics.get("quote_count", 0),
            "bookmarks": tweet_metrics.get("bookmark_count", 0),
        },
    )


async def search_x_posts(query: str, limit: int = 5) -> list[SocialPostData]:
    """
    Search X (Twitter) for recent tweets matching a text query (e.g. claim text) via X API v2.
    Returns matching tweets with author handle, verification status, metrics, and permalink.
    """
    if not settings.X_API_BEARER_TOKEN or settings.X_API_BEARER_TOKEN.startswith("your_"):
        logger.debug("X_API_BEARER_TOKEN is not configured; skipping X search")
        return []

    import urllib.parse
    encoded_query = urllib.parse.quote(query)
    endpoint = (
        f"https://api.twitter.com/2/tweets/search/recent"
        f"?query={encoded_query}&max_results={max(10, min(100, limit))}"
        f"&expansions=author_id"
        f"&tweet.fields=created_at,public_metrics,author_id"
        f"&user.fields=created_at,public_metrics,verified,name,username"
    )

    headers = {
        "Authorization": f"Bearer {settings.X_API_BEARER_TOKEN}",
        "User-Agent": "CredoVerificationEngine/1.0",
    }

    try:
        res = await safe_fetch_url(endpoint, headers=headers, timeout=10.0)
        res.raise_for_status()

        import json
        payload = json.loads(res.text)

        tweets = payload.get("data", [])
        includes = payload.get("includes", {})
        users_map = {u["id"]: u for u in includes.get("users", []) if "id" in u}

        results = []
        for tweet in tweets[:limit]:
            author_id = tweet.get("author_id")
            author_info = users_map.get(author_id, {}) if author_id else {}
            author_metrics = author_info.get("public_metrics", {})
            tweet_metrics = tweet.get("public_metrics", {})

            author_handle = author_info.get("username", "unknown")
            tweet_id = tweet.get("id")
            post_url = f"https://x.com/{author_handle}/status/{tweet_id}" if tweet_id else ""

            results.append(
                SocialPostData(
                    platform="x",
                    author_handle=author_handle,
                    author_display_name=author_info.get("name"),
                    author_verified=bool(author_info.get("verified", False)),
                    author_follower_count=author_metrics.get("followers_count"),
                    author_account_created_at=_parse_iso_datetime(author_info.get("created_at")),
                    post_text=tweet.get("text", ""),
                    post_created_at=_parse_iso_datetime(tweet.get("created_at")),
                    media_urls=[post_url] if post_url else [],
                    parent_post_url=None,
                    engagement={
                        "likes": tweet_metrics.get("like_count", 0),
                        "reposts": tweet_metrics.get("retweet_count", 0),
                        "replies": tweet_metrics.get("reply_count", 0),
                        "quotes": tweet_metrics.get("quote_count", 0),
                        "impression_count": tweet_metrics.get("impression_count", 0),
                    },
                )
            )
        return results
    except Exception as e:
        logger.warning(f"X API search failed for query '{query}': {e!s}")
        return []


async def fetch_reddit_post(url: str) -> SocialPostData:
    """Fetch post and author metadata from Reddit public API."""
    parsed_url = urlparse(url)
    clean_path = parsed_url.path.rstrip("/")
    if not clean_path.endswith(".json"):
        json_url = f"https://www.reddit.com{clean_path}.json"
    else:
        json_url = f"https://www.reddit.com{clean_path}"

    headers = {"User-Agent": "CredoVerificationEngine/1.0 (by /u/CredoBot)"}
    res = await safe_fetch_url(json_url, headers=headers, timeout=10.0)
    res.raise_for_status()

    import json
    data_list = json.loads(res.text)

    if not isinstance(data_list, list) or not data_list:
        raise ValueError("Invalid Reddit JSON format")

    post_listing = data_list[0].get("data", {}).get("children", [])
    if not post_listing:
        raise ValueError("No post found in Reddit listing")

    post_data = post_listing[0].get("data", {})

    title = post_data.get("title", "")
    selftext = post_data.get("selftext", "")
    post_text = f"{title}\n\n{selftext}".strip() if selftext else title

    created_utc = post_data.get("created_utc")
    post_created_at = datetime.fromtimestamp(created_utc, tz=timezone.utc) if created_utc else None

    author_handle = post_data.get("author", "[deleted]")

    media_urls = []
    post_url = post_data.get("url")
    if post_url and not post_url.startswith("https://www.reddit.com"):
        media_urls.append(post_url)

    return SocialPostData(
        platform="reddit",
        author_handle=author_handle,
        author_display_name=f"u/{author_handle}" if author_handle else None,
        author_verified=False,
        author_follower_count=None,
        author_account_created_at=None,
        post_text=post_text,
        post_created_at=post_created_at,
        media_urls=media_urls,
        parent_post_url=None,
        engagement={
            "score": post_data.get("score", 0),
            "upvote_ratio": post_data.get("upvote_ratio", 0.0),
            "num_comments": post_data.get("num_comments", 0),
            "ups": post_data.get("ups", 0),
        },
    )


async def ingest_social_post(raw: str) -> SocialPostData:
    """
    Ingests a social media post URL or raw text.
    Routes to official X / Reddit API fetchers when keys/URLs permit,
    or falls back gracefully to the regex stub parser without failing.
    """
    platform = _detect_platform(raw)

    if platform in ("x", "twitter") and ("twitter.com" in raw or "x.com" in raw):
        try:
            return await fetch_x_post(raw)
        except Exception as e:
            logger.warning(f"X API fetch failed for '{raw}', falling back to stub: {e!s}")

    elif platform == "reddit" and "reddit.com" in raw:
        try:
            return await fetch_reddit_post(raw)
        except Exception as e:
            logger.warning(f"Reddit API fetch failed for '{raw}', falling back to stub: {e!s}")

    # Fallback path for Facebook, Instagram, TikTok, or failed API calls
    stub = parse_social_post(raw)
    author_handle = ""
    if platform:
        # Try best effort handle extraction from URL
        match = re.search(r"https?://(?:www\.)?(?:twitter\.com|x\.com|instagram\.com|tiktok\.com)/@?([\w\.]+)", raw)
        if match:
            author_handle = match.group(1)

    return SocialPostData(
        platform=platform or "unknown",
        author_handle=author_handle,
        author_display_name=author_handle or None,
        author_verified=False,
        author_follower_count=None,
        author_account_created_at=None,
        post_text=stub.get("text", raw),
        post_created_at=None,
        media_urls=[],
        parent_post_url=None,
        engagement={},
    )


async def search_reddit_posts(query: str, limit: int = 5) -> list[SocialPostData]:
    """
    Search Reddit for public posts matching a text query (e.g. claim text) via public .json search API.
    Returns matching posts with author metadata and engagement stats (upvotes, comments, subreddit).
    """
    import urllib.parse
    encoded_query = urllib.parse.quote(query)
    search_url = f"https://www.reddit.com/search.json?q={encoded_query}&sort=relevance&limit={limit}"

    headers = {"User-Agent": "CredoVerificationEngine/1.0 (by /u/CredoBot)"}
    try:
        res = await safe_fetch_url(search_url, headers=headers, timeout=10.0)
        res.raise_for_status()
        import json
        data = json.loads(res.text)
        children = data.get("data", {}).get("children", [])

        results = []
        for child in children:
            post_data = child.get("data", {})
            title = post_data.get("title", "")
            selftext = post_data.get("selftext", "")
            post_text = f"{title}\n\n{selftext}".strip() if selftext else title
            created_utc = post_data.get("created_utc")
            post_created_at = datetime.fromtimestamp(created_utc, tz=timezone.utc) if created_utc else None
            author_handle = post_data.get("author", "[deleted]")
            permalink = post_data.get("permalink")
            post_url = f"https://www.reddit.com{permalink}" if permalink else post_data.get("url")

            results.append(
                SocialPostData(
                    platform="reddit",
                    author_handle=author_handle,
                    author_display_name=f"u/{author_handle}" if author_handle else None,
                    author_verified=False,
                    author_follower_count=None,
                    author_account_created_at=None,
                    post_text=post_text,
                    post_created_at=post_created_at,
                    media_urls=[post_url] if post_url else [],
                    parent_post_url=None,
                    engagement={
                        "score": post_data.get("score", 0),
                        "upvote_ratio": post_data.get("upvote_ratio", 0.0),
                        "num_comments": post_data.get("num_comments", 0),
                        "ups": post_data.get("ups", 0),
                        "subreddit": post_data.get("subreddit", ""),
                    },
                )
            )
        return results
    except Exception as e:
        logger.warning(f"Reddit search failed for query '{query}': {e!s}")
        return []


__all__ = [
    "SocialPostData",
    "fetch_x_post",
    "fetch_reddit_post",
    "search_x_posts",
    "search_reddit_posts",
    "ingest_social_post",
]
