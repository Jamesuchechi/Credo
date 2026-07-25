import uuid

from pydantic import BaseModel


class SourceResponse(BaseModel):
    id: uuid.UUID
    domain: str
    name: str
    historical_accuracy_score: float
    bias_rating: str
    whois_age_days: int | None = None
    is_known_satire: bool
    is_known_misinfo: bool
    label: str
