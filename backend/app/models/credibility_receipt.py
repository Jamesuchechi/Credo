import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class CredibilityReceipt(Base):
    """
    Point-in-time cryptographically signed credibility receipt for analyzed content items.
    Allows public verification of credibility scores without leaking internal user IDs or PII.
    """

    __tablename__ = "credibility_receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    public_slug = Column(String(32), unique=True, nullable=False, index=True)
    verdict_summary = Column(
        JSON().with_variant(JSONB(), "postgresql"),
        nullable=False,
    )
    signature = Column(String(255), nullable=False)
    issued_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    content_item = relationship("ContentItem", backref="receipts")
