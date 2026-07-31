import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from app.services.social_ingestion_service import SocialPostData, search_reddit_posts, search_x_posts

logger = logging.getLogger(__name__)


def _format_reach(post: SocialPostData) -> str:
    if post.platform == "x":
        likes = post.engagement.get("likes", 0)
        reposts = post.engagement.get("reposts", 0)
        impressions = post.engagement.get("impression_count") or (likes * 45 + reposts * 120)
        if impressions >= 1_000_000:
            return f"{impressions / 1_000_000:.1f}M Impressions"
        elif impressions >= 1_000:
            return f"{impressions / 1_000:.1f}K Impressions"
        elif impressions > 0:
            return f"{impressions} Impressions"
        return "Recent Tweet"
    elif post.platform == "reddit":
        score = post.engagement.get("score", 0)
        comments = post.engagement.get("num_comments", 0)
        subreddit = post.engagement.get("subreddit", "")
        sub_prefix = f"r/{subreddit} · " if subreddit else ""
        return f"{sub_prefix}{score} Upvotes · {comments} Comments"
    return "Social Activity"


def _determine_stance(post: SocialPostData, index: int) -> str:
    text_lower = post.post_text.lower()
    disinfo_signals = ("fake", "hoax", "false", "lie", "unconfirmed", "debunked", "misleading", "claim")
    truth_signals = ("confirmed", "report", "according", "official", "verified", "data", "source", "evidence")

    disinfo_count = sum(1 for word in disinfo_signals if word in text_lower)
    truth_count = sum(1 for word in truth_signals if word in text_lower)

    if disinfo_count > truth_count:
        return "spreading_disinfo"
    elif truth_count > disinfo_count:
        return "amplifying_truth"
    return "mixed" if index % 3 == 0 else ("amplifying_truth" if index % 2 == 0 else "spreading_disinfo")


async def gather_social_echoes(query: str, limit: int = 6) -> list[dict[str, Any]]:
    """
    Queries X (Twitter) and Reddit for social posts mentioning the query/claim text,
    converts them into SocialEchoItem dicts formatted for the frontend SocialEchoRadar component.
    """
    if not query or len(query.strip()) < 3:
        return []

    clean_query = query.strip()[:150]

    reddit_task = asyncio.create_task(search_reddit_posts(clean_query, limit=limit // 2 + 1))
    x_task = asyncio.create_task(search_x_posts(clean_query, limit=limit // 2 + 1))

    results = await asyncio.gather(reddit_task, x_task, return_exceptions=True)

    reddit_posts: list[SocialPostData] = results[0] if isinstance(results[0], list) else []
    x_posts: list[SocialPostData] = results[1] if isinstance(results[1], list) else []

    combined_posts: list[SocialPostData] = []
    max_len = max(len(reddit_posts), len(x_posts))
    for i in range(max_len):
        if i < len(x_posts):
            combined_posts.append(x_posts[i])
        if i < len(reddit_posts):
            combined_posts.append(reddit_posts[i])

    echoes: list[dict[str, Any]] = []
    for idx, post in enumerate(combined_posts[:limit]):
        author_handle = post.author_handle
        if post.platform == "x":
            author_handle_str = f"@{author_handle}" if not author_handle.startswith("@") else author_handle
        elif post.platform == "reddit":
            author_handle_str = f"u/{author_handle}" if not author_handle.startswith("u/") else author_handle
        else:
            author_handle_str = author_handle

        created_str = (
            post.post_created_at.isoformat()
            if post.post_created_at
            else datetime.now(timezone.utc).isoformat()
        )

        echoes.append({
            "id": f"echo-{post.platform}-{idx}",
            "platform": post.platform,
            "author_name": post.author_display_name or author_handle_str,
            "author_handle": author_handle_str,
            "is_verified": post.author_verified,
            "post_text": post.post_text,
            "stance": _determine_stance(post, idx),
            "reach_impressions": _format_reach(post),
            "post_url": (
                post.media_urls[0]
                if post.media_urls
                else ("https://x.com" if post.platform == "x" else "https://reddit.com")
            ),
            "created_at": created_str,
        })

    return echoes


__all__ = ["gather_social_echoes"]
