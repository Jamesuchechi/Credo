import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.claim import ClaimResponse


class ContentSubmissionRequest(BaseModel):
    modality: str = "url"  # url, text, image, video, audio, screenshot, social_post
    payload: str
    metadata: dict[str, Any] | None = None


class SubmissionResponse(BaseModel):
    content_id: uuid.UUID
    status: str
    message: str


class ContentAnalysisResponse(BaseModel):
    content_id: uuid.UUID
    modality: str
    url: str | None = None
    title: str | None = None
    status: str
    composite_score: float | None = None
    dimension_scores: dict[str, Any] | None = None
    reasoning_chain: dict[str, Any] | None = None
    corroborating_sources: list[dict[str, Any]] | None = None
    claims: list[ClaimResponse] = []
    model_version: str | None = None
    created_at: datetime
