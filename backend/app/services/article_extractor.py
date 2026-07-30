import logging
from typing import Any

import trafilatura
from app.services.pii_redactor import redact_pii
from app.services.safe_http_client import safe_fetch_url

logger = logging.getLogger(__name__)


async def extract_article_content(url: str) -> dict[str, Any]:
    """
    Ingests a URL, fetches clean article HTML/text using safe_fetch_url + trafilatura,
    and returns normalized title, text, and metadata. Enforces SSRF defense.
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CredoEngine/1.0"
        }
        response = await safe_fetch_url(
            url,
            headers=headers,
            timeout=10.0,
            max_size_bytes=5 * 1024 * 1024,
        )
        response.raise_for_status()
        html_content = response.text

        # Extract main text content
        extracted_text = trafilatura.extract(
            html_content,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )

        # Extract metadata (title, author, date)
        metadata_raw = trafilatura.extract_metadata(html_content)
        title: str | None = metadata_raw.title if metadata_raw else None

        if not extracted_text:
            extracted_text = html_content[:2000]

        # redact PII from extracted text
        cleaned = redact_pii(extracted_text or "")

        return {
            "title": title or "Untitled Article",
            "extracted_text": cleaned,
            "raw_html_length": len(html_content),
            "success": True,
        }
    except Exception as e:
        logger.error(f"Error extracting article content from {url}: {e!s}")
        return {
            "title": "Extraction Failed",
            "extracted_text": "",
            "raw_html_length": 0,
            "success": False,
            "error": str(e),
        }
