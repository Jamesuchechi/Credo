import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ExtractedClaimItem(BaseModel):
    claim_text: str = Field(..., description="Explicit, verifiable factual assertion")
    extracted_speaker: str | None = Field(None, description="Person or organization making the claim")
    topic_category: str | None = Field("general", description="Domain or topic of assertion")


class ExtractedClaimsList(BaseModel):
    claims: list[ExtractedClaimItem] = Field(default_factory=list)


class ClaimResponse(BaseModel):
    id: uuid.UUID
    content_item_id: uuid.UUID
    claim_text: str
    extracted_speaker: str | None = None
    verdict: str
    confidence_score: float
    confidence_interval: dict[str, float] | None = None
    evidence_summary: str
    reasoning_chain: dict[str, Any]
    created_at: datetime
    ttl_expires_at: datetime | None = None
