import uuid

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    analyses_count_this_week: int
    avg_factual_accuracy: float | None
    sources_flagged_count: int
    avg_turnaround_seconds: float | None


class SourceListItem(BaseModel):
    id: uuid.UUID
    domain: str
    name: str
    score: float
    trend_label: str


class SourcesListResponse(BaseModel):
    items: list[SourceListItem]
    total: int
    page: int
    page_size: int


class ModelVersionEntry(BaseModel):
    version: str
    date: str
    title: str
    changes: list[str]


class ModelVersionChangelogResponse(BaseModel):
    current_version: str
    entries: list[ModelVersionEntry]