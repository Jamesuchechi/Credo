import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CorrectionSubmissionRequest(BaseModel):
    proposed_verdict: str = Field(..., description="Proposed verdict: supported, contradicted, or unverified")
    evidence_text: str = Field(..., description="Detailed textual evidence or reasoning")
    evidence_urls: list[str] = Field(default=[], description="Supporting URLs / reference links")


class ClaimCorrectionResponse(BaseModel):
    id: uuid.UUID
    claim_id: uuid.UUID
    contributor_id: uuid.UUID
    proposed_verdict: str
    evidence_text: str
    evidence_urls: list[Any]
    status: str
    reviewer_id: uuid.UUID | None = None
    review_notes: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    contributor_name: str | None = None
    contributor_role: str | None = None


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(..., description="Review decision: approved or rejected")
    review_notes: str | None = Field(default=None, description="Optional reasoning notes from reviewer")


class ContributorResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    reputation_score: float
    verified_submissions_count: int
    accuracy_rate: float
    full_name: str | None = None


class ReviewQueueItemResponse(BaseModel):
    correction_id: uuid.UUID
    claim_id: uuid.UUID
    claim_text: str
    original_verdict: str
    proposed_verdict: str
    evidence_text: str
    evidence_urls: list[Any]
    submitted_at: datetime
    contributor_name: str
    contributor_role: str
    contributor_reputation: float


class ReviewQueueListResponse(BaseModel):
    items: list[ReviewQueueItemResponse]
    total: int
    page: int
    page_size: int


class LeaderboardResponse(BaseModel):
    items: list[ContributorResponse]
