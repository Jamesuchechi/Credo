import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("content_items.id"), nullable=False)
    composite_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    dimension_scores: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False)
    reasoning_chain: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False)
    corroborating_sources: Mapped[list] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), default="v1.0.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    content_item = relationship("ContentItem", lazy="joined")
