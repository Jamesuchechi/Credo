import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QuizItem(Base):
    __tablename__ = "quiz_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True
    )
    redacted_claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    correct_verdict: Mapped[str] = mapped_column(String(50), nullable=False)  # "supported", "contradicted", "unverified"
    explanation_summary: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty_tag: Mapped[str] = mapped_column(String(20), default="medium", nullable=False, index=True)  # "easy", "medium", "hard"
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    times_played: Mapped[int] = mapped_column(Integer, default=0)
    times_correct: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    content_item = relationship("ContentItem", lazy="joined")
