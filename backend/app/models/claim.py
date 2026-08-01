import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="CASCADE"), index=True, nullable=False)
    
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    # extracted_speaker: Speaker attributed inside the claim text (e.g. "President Said"), NOT the social account poster (see ContentItem.social_author_id)
    extracted_speaker: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verdict: Mapped[str] = mapped_column(String(50), default="unverified", nullable=False)  # supported, contradicted, unverified
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    evidence_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    
    reasoning_chain: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        default=dict,
        nullable=False
    )
    
    parent_claim_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    mutation_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    ttl_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    content_item = relationship("ContentItem", back_populates="claims")
    parent_claim = relationship("Claim", remote_side=[id], backref="child_claims")
