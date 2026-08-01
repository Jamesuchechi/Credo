import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.safe_http import safe_fetch_url
from app.models.cited_source import CitedSource, ContentItemCitedSource
from app.models.content_item import ContentItem

logger = logging.getLogger(__name__)

RETRACTION_PATTERNS = [
    r"\bretraction\b",
    r"\bretracted\b",
    r"\beditor'?s\s+note\b",
    r"\bcorrection\s+notice\b",
    r"\berratum\b",
    r"\barticle\s+withdrawn\b",
    r"\bclarification\s+notice\b",
]


def compute_text_hash(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def detect_retraction_keyword(text: str) -> str | None:
    text_lower = text.lower()
    for pattern in RETRACTION_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            return match.group(0)
    return None


async def register_cited_sources(
    db: AsyncSession, content_item_id: uuid.UUID, sources: list[dict[str, Any]]
) -> list[CitedSource]:
    """
    Registers external source URLs cited during corroboration, computes initial text hashes,
    and links them to the ContentItem.
    """
    registered = []
    if not sources:
        return registered

    for src in sources:
        url = src.get("url") or src.get("link")
        if not url or not url.startswith(("http://", "https://")):
            continue

        try:
            # Check if URL already exists in cited_sources
            stmt = select(CitedSource).where(CitedSource.source_url == url)
            res = await db.execute(stmt)
            cited_src = res.scalar_one_or_none()

            text_content = src.get("title", "") + " " + src.get("snippet", "")
            content_hash = compute_text_hash(text_content if text_content.strip() else url)

            if not cited_src:
                cited_src = CitedSource(
                    id=uuid.uuid4(),
                    source_url=url,
                    content_hash_at_citation=content_hash,
                    first_cited_at=datetime.now(timezone.utc),
                    last_checked_at=datetime.now(timezone.utc),
                    status="active",
                )
                db.add(cited_src)
                await db.flush()

            # Link content_item to cited_source if not linked
            link_stmt = select(ContentItemCitedSource).where(
                ContentItemCitedSource.content_item_id == content_item_id,
                ContentItemCitedSource.cited_source_id == cited_src.id,
            )
            link_res = await db.execute(link_stmt)
            if not link_res.scalar_one_or_none():
                link = ContentItemCitedSource(
                    content_item_id=content_item_id,
                    cited_source_id=cited_src.id,
                )
                db.add(link)

            registered.append(cited_src)
        except Exception as e:
            logger.warning(f"Error registering cited source {url}: {e!s}")

    await db.commit()
    return registered


async def recheck_cited_source_record(db: AsyncSession, source: CitedSource) -> bool:
    """
    Safely re-fetches a cited source URL using safe_http, diffs content hash,
    detects 404/retraction/correction, and flags affected content items if status changed.
    """
    now = datetime.now(timezone.utc)
    old_status = source.status
    new_status = "active"
    update_notes = None

    try:
        res = await safe_fetch_url(source.source_url, timeout=10.0)
        if res.status_code in (404, 410):
            new_status = "404_removed"
            update_notes = f"Source article removed (HTTP {res.status_code})"
        elif res.status_code >= 400:
            new_status = "404_removed"
            update_notes = f"Source URL unavailable (HTTP {res.status_code})"
        else:
            new_hash = compute_text_hash(res.text)
            if new_hash != source.content_hash_at_citation:
                keyword = detect_retraction_keyword(res.text)
                if keyword:
                    new_status = "retracted"
                    update_notes = f"Retraction notice detected on source page ('{keyword}')"
                else:
                    new_status = "updated"
                    update_notes = "Source article content was modified after initial citation"

    except Exception as e:
        logger.warning(f"Watchdog fetch failed for {source.source_url}: {e!s}")
        new_status = "404_removed"
        update_notes = f"Source fetch failed: {e!s}"

    source.last_checked_at = now
    source.status = new_status
    source.update_notes = update_notes

    # If source status is not active, flag linked content items
    if new_status != "active":
        links_stmt = select(ContentItemCitedSource.content_item_id).where(
            ContentItemCitedSource.cited_source_id == source.id
        )
        links_res = await db.execute(links_stmt)
        item_ids = links_res.scalars().all()

        if item_ids:
            notice = f"A source used in this analysis ({source.source_url}) has been flagged as '{new_status}': {update_notes}"
            flag_stmt = (
                update(ContentItem)
                .where(ContentItem.id.in_(item_ids))
                .values(
                    has_flagged_source_update=True,
                    source_update_notice=notice,
                )
            )
            await db.execute(flag_stmt)

    await db.commit()
    return new_status != old_status


async def recheck_all_cited_sources(db: AsyncSession, limit: int = 50) -> dict[str, int]:
    """
    Batch job to recheck older cited sources and update retraction status.
    """
    stmt = (
        select(CitedSource)
        .order_by(CitedSource.last_checked_at.asc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    sources = res.scalars().all()

    summary = {"total_checked": len(sources), "retracted": 0, "updated": 0, "404_removed": 0}

    for src in sources:
        changed = await recheck_cited_source_record(db, src)
        if src.status in summary:
            summary[src.status] += 1

    return summary


async def get_flagged_sources_for_content(
    db: AsyncSession, content_item_id: uuid.UUID
) -> list[dict[str, Any]]:
    """
    Returns list of non-active (updated/retracted/404) cited sources for a content item.
    """
    stmt = (
        select(CitedSource)
        .join(ContentItemCitedSource, ContentItemCitedSource.cited_source_id == CitedSource.id)
        .where(
            ContentItemCitedSource.content_item_id == content_item_id,
            CitedSource.status != "active",
        )
    )
    res = await db.execute(stmt)
    sources = res.scalars().all()

    return [
        {
            "source_url": s.source_url,
            "status": s.status,
            "first_cited_at": s.first_cited_at.isoformat() if s.first_cited_at else None,
            "last_checked_at": s.last_checked_at.isoformat() if s.last_checked_at else None,
            "update_notes": s.update_notes,
        }
        for s in sources
    ]
