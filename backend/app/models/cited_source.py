import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class CitedSource(Base):
    """
    Tracks external source URLs cited during corroboration across analysis reports.
    Allows the Retraction Watchdog to recheck source content hashes and flag retractions.
    """

    __tablename__ = "cited_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url = Column(Text, unique=True, nullable=False, index=True)
    content_hash_at_citation = Column(String(64), nullable=False)
    first_cited_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    last_checked_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    status = Column(String(50), nullable=False, default="active", index=True)  # active, updated, retracted, 404_removed
    update_notes = Column(Text, nullable=True)

    items = relationship(
        "ContentItem",
        secondary="content_item_cited_sources",
        backref="cited_sources_list",
    )


class ContentItemCitedSource(Base):
    """
    Join table linking ContentItem to CitedSource.
    """

    __tablename__ = "content_item_cited_sources"

    content_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content_items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    cited_source_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cited_sources.id", ondelete="CASCADE"),
        primary_key=True,
    )
