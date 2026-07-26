import logging
import re
from typing import Any

from urllib.parse import urlparse

logger = logging.getLogger(__name__)

PLATFORM_PATTERNS = [
    ("twitter", re.compile(r"https?://(?:www\.)?twitter\.com/\w+/status/\d+")),
    ("x", re.compile(r"https?://(?:www\.)?x\.com/\w+/status/\d+")),
    ("reddit", re.compile(r"https?://(?:www\.)?reddit\.com/r/[\w]+/comments/[\w]+/")),
    ("facebook", re.compile(r"https?://(?:www\.)?facebook\.com/[\w\.]+/posts/[\w]+")),
    ("instagram", re.compile(r"https?://(?:www\.)?instagram\.com/p/[\w-]+")),
    ("tiktok", re.compile(r"https?://(?:www\.)?tiktok\.com/@[\w\.]+/video/\d+")),
]


def _detect_platform(raw: str) -> str | None:
    for name, pattern in PLATFORM_PATTERNS:
        if pattern.search(raw):
            return name
    return None


def parse_social_post(raw: str) -> dict[str, Any]:
    """Minimal social media post parser.

    Extracts a best-effort text representation and source domain from a
    social post URL or raw post text. Returns a dict with at least ``text``.
    """
    platform = _detect_platform(raw)
    domain = None
    text = raw

    if platform:
        pattern = next(p for n, p in PLATFORM_PATTERNS if n == platform)
        match = pattern.search(raw)
        if match:
            url = match.group(0)
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            text = f"[{platform}] {url}"

    return {
        "platform": platform,
        "domain": domain,
        "title": None,
        "text": text,
    }


__all__ = ["parse_social_post"]
