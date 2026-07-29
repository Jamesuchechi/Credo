import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base


class ClaimCorrection(Base):
    __tablename__ = "claim_corrections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    contributor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contributors.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    proposed_verdict: Mapped[str] = mapped_column(String(50), nullable=False)  # supported, contradicted, unverified
    evidence_text: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_urls: Mapped[list[Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        default=list,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, approved, rejected
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contributors.id", ondelete="SET NULL"),
        nullable=True,
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    claim = relationship("Claim", backref="corrections")
    contributor = relationship("Contributor", foreign_keys=[contributor_id], backref="submitted_corrections")
    reviewer = relationship("Contributor", foreign_keys=[reviewer_id], backref="reviewed_corrections")
