import logging
from typing import Any

import httpx
import trafilatura

logger = logging.getLogger(__name__)


async def extract_article_content(url: str) -> dict[str, Any]:
    """
    Ingests a URL, fetches clean article HTML/text using httpx + trafilatura,
    and returns normalized title, text, and metadata.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CredoEngine/1.0"
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            html_content = response.text

        # Extract main text content
        extracted_text = trafilatura.extract(
            html_content,
            include_comments=False,
            include_tables=False,
            no_fallback=False
        )

        # Extract metadata (title, author, date)
        metadata_raw = trafilatura.extract_metadata(html_content)
        title: str | None = metadata_raw.title if metadata_raw else None

        if not extracted_text:
            extracted_text = html_content[:2000]

        return {
            "title": title or "Untitled Article",
            "extracted_text": extracted_text or "",
            "raw_html_length": len(html_content),
            "success": True
        }
    except Exception as e:
        logger.error(f"Error extracting article content from {url}: {e!s}")
        return {
            "title": "Extraction Failed",
            "extracted_text": "",
            "raw_html_length": 0,
            "success": False,
            "error": str(e)
        }
