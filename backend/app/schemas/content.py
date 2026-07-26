import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.claim import ClaimResponse


class ContentSubmissionRequest(BaseModel):
    modality: str = "url"
    payload: str
    metadata: dict[str, Any] | None = None


class SubmissionResponse(BaseModel):
    content_id: uuid.UUID
    status: str
    message: str


class CredibilityCardResponse(BaseModel):
    content_id: uuid.UUID
    title: str | None
    composite_score: float | None
    confidence_interval: dict[str, float] | None
    dimension_scores: dict[str, Any] | None
    verdict: str | None
    claims_count: int
    model_version: str | None
    created_at: datetime
    source_domain: str | None


class ContentAnalysisResponse(BaseModel):
    content_id: uuid.UUID
    modality: str
    url: str | None = None
    title: str | None = None
    status: str
    composite_score: float | None = None
    confidence_interval: dict[str, float] | None = None
    dimension_scores: dict[str, Any] | None = None
    reasoning_chain: dict[str, Any] | None = None
    corroborating_sources: list[dict[str, Any]] | None = None
    claims: list[ClaimResponse] = []
    model_version: str | None = None
    created_at: datetime


class ContentItemSummary(BaseModel):
    id: uuid.UUID
    title: str | None
    source_domain: str | None
    status: str
    verdict: str | None
    claims_count: int
    composite_score: float | None
    created_at: datetime


class ContentListResponse(BaseModel):
    items: list[ContentItemSummary]
    total: int
    page: int
    page_size: int
