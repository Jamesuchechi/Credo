import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ReceiptResponse(BaseModel):
    public_slug: str
    issued_at: datetime
    verdict_summary: dict[str, Any]
    signature: str
    is_valid_signature: bool = True
    public_url: str
    verification_page_url: str


class ReceiptVerificationResponse(BaseModel):
    public_slug: str
    is_valid_signature: bool
    signature: str
    issued_at: datetime
    verdict_summary: dict[str, Any]
    message: str
