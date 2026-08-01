import logging
import random
import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz_item import QuizItem
from app.models.user import User

logger = logging.getLogger(__name__)


async def curate_quiz_item(
    db: AsyncSession,
    admin_user: User,
    content_item_id: uuid.UUID | None,
    redacted_claim_text: str,
    correct_verdict: str,
    explanation_summary: str,
    difficulty_tag: str = "medium",
) -> QuizItem:
    """
    Curates and approves an analyzed claim into the public literacy game pool.
    RBAC Enforced: Requires admin_user.role in ("admin", "moderator").
    """
    if admin_user.role not in ("admin", "moderator"):
        raise HTTPException(
            status_code=403,
            detail="Admin or Moderator authorization required to curate public literacy game items.",
        )

    valid_verdicts = {"supported", "contradicted", "unverified"}
    if correct_verdict.lower() not in valid_verdicts:
        raise HTTPException(status_code=400, detail=f"Invalid correct_verdict. Must be one of {valid_verdicts}")

    quiz_item = QuizItem(
        id=uuid.uuid4(),
        content_item_id=content_item_id,
        redacted_claim_text=redacted_claim_text.strip(),
        correct_verdict=correct_verdict.lower(),
        explanation_summary=explanation_summary.strip(),
        difficulty_tag=difficulty_tag.lower(),
        is_approved=True,
        times_played=0,
        times_correct=0,
    )
    db.add(quiz_item)
    await db.commit()
    await db.refresh(quiz_item)
    return quiz_item


async def get_quiz_questions(
    db: AsyncSession, count: int = 5, difficulty: str | None = None
) -> list[dict[str, Any]]:
    """
    Fetches random approved quiz items for the public anonymous game loop.
    Does NOT reveal correct_verdict in the response payload.
    """
    stmt = select(QuizItem).where(QuizItem.is_approved == True)
    if difficulty:
        stmt = stmt.where(QuizItem.difficulty_tag == difficulty.lower())

    res = await db.execute(stmt)
    items = list(res.scalars().all())

    if not items:
        return []

    # Random sample up to count
    selected = random.sample(items, min(count, len(items)))

    return [
        {
            "quiz_item_id": str(item.id),
            "claim_text": item.redacted_claim_text,
            "difficulty": item.difficulty_tag,
            "options": ["supported", "contradicted", "unverified"],
            "community_times_played": item.times_played,
        }
        for item in selected
    ]


async def submit_quiz_answer(
    db: AsyncSession, quiz_item_id: uuid.UUID, user_guess: str
) -> dict[str, Any]:
    """
    Evaluates a user's guess, increments aggregated play/correct statistics,
    and feeds user answers back as weak labels into evaluation telemetry.
    """
    stmt = select(QuizItem).where(QuizItem.id == quiz_item_id)
    res = await db.execute(stmt)
    quiz_item = res.scalar_one_or_none()

    if not quiz_item:
        raise HTTPException(status_code=404, detail="Quiz question item not found")

    normalized_guess = user_guess.lower().strip()
    is_correct = normalized_guess == quiz_item.correct_verdict.lower()

    # Increment weak label telemetry counters
    quiz_item.times_played += 1
    if is_correct:
        quiz_item.times_correct += 1

    await db.commit()

    community_accuracy = (
        (quiz_item.times_correct / quiz_item.times_played * 100.0)
        if quiz_item.times_played > 0
        else 100.0
    )

    return {
        "quiz_item_id": str(quiz_item.id),
        "user_guess": normalized_guess,
        "correct_verdict": quiz_item.correct_verdict,
        "is_correct": is_correct,
        "explanation_summary": quiz_item.explanation_summary,
        "community_accuracy_percent": round(community_accuracy, 1),
        "times_played": quiz_item.times_played,
    }
