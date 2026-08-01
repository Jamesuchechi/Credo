import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.quiz_service import (
    curate_quiz_item,
    get_quiz_questions,
    submit_quiz_answer,
)

router = APIRouter(prefix="/quiz", tags=["Literacy Quiz Game"])


class CurateQuizItemRequest(BaseModel):
    content_item_id: uuid.UUID | None = None
    redacted_claim_text: str = Field(..., min_length=5)
    correct_verdict: str = Field(..., json_schema_extra={"example": "supported"})
    explanation_summary: str = Field(..., min_length=5)
    difficulty_tag: str = Field("medium", json_schema_extra={"example": "medium"})


class SubmitAnswerRequest(BaseModel):
    quiz_item_id: uuid.UUID
    user_guess: str = Field(..., json_schema_extra={"example": "supported"})


@router.get("/items")
async def fetch_public_quiz_items(
    count: int = Query(5, ge=1, le=20),
    difficulty: str | None = Query(None, description="Optional difficulty filter: easy, medium, hard"),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """
    Public / Anonymous endpoint: Fetches a set of active quiz questions for the public game loop.
    Does NOT require authentication or user signup.
    """
    return await get_quiz_questions(db, count=count, difficulty=difficulty)


@router.post("/answer")
async def submit_public_quiz_answer(
    payload: SubmitAnswerRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Public / Anonymous endpoint: Submits a user's guess, returns verdict explanation,
    and records aggregated weak label telemetry.
    """
    return await submit_quiz_answer(db, payload.quiz_item_id, payload.user_guess)


@router.post("/admin/curate")
async def admin_curate_quiz_item_endpoint(
    payload: CurateQuizItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Admin RBAC Endpoint: Curates and approves an analyzed claim into the public literacy game question pool.
    Requires current_user.role in ("admin", "moderator").
    """
    quiz_item = await curate_quiz_item(
        db=db,
        admin_user=current_user,
        content_item_id=payload.content_item_id,
        redacted_claim_text=payload.redacted_claim_text,
        correct_verdict=payload.correct_verdict,
        explanation_summary=payload.explanation_summary,
        difficulty_tag=payload.difficulty_tag,
    )
    return {
        "status": "curated",
        "quiz_item_id": str(quiz_item.id),
        "difficulty_tag": quiz_item.difficulty_tag,
        "is_approved": quiz_item.is_approved,
    }
