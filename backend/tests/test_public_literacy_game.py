import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.quiz_item import QuizItem
from app.models.user import User
from app.services.quiz_service import (
    curate_quiz_item,
    get_quiz_questions,
    submit_quiz_answer,
)


def make_test_user(role="user"):
    return User(
        id=uuid.uuid4(),
        email=f"{role}_tester@example.com",
        hashed_password="hashed_pass",
        full_name=f"{role.capitalize()} Tester",
        role=role,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.mark.asyncio
async def test_admin_curate_quiz_item_rbac():
    admin_user = make_test_user(role="admin")
    regular_user = make_test_user(role="user")

    mock_db = AsyncMock()

    # 1. Admin user curation succeeds
    item = await curate_quiz_item(
        db=mock_db,
        admin_user=admin_user,
        content_item_id=uuid.uuid4(),
        redacted_claim_text="Lab achieved 35% solar efficiency.",
        correct_verdict="supported",
        explanation_summary="Corroborated by independent lab tests.",
        difficulty_tag="medium",
    )
    assert item.is_approved is True
    assert item.correct_verdict == "supported"

    # 2. Regular user curation fails with 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        await curate_quiz_item(
            db=mock_db,
            admin_user=regular_user,
            content_item_id=uuid.uuid4(),
            redacted_claim_text="Lab achieved 35% solar efficiency.",
            correct_verdict="supported",
            explanation_summary="Corroborated by independent lab tests.",
        )
    assert exc_info.value.status_code == 403
    assert "Authorization required" in exc_info.value.detail or "Admin" in exc_info.value.detail


@pytest.mark.asyncio
async def test_fetch_public_quiz_items_anonymous():
    quiz_id = uuid.uuid4()
    fake_quiz_item = QuizItem(
        id=quiz_id,
        redacted_claim_text="Test claim for quiz pool.",
        correct_verdict="contradicted",
        explanation_summary="Debunked by news wires.",
        difficulty_tag="easy",
        is_approved=True,
        times_played=10,
        times_correct=8,
    )

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars().all.return_value = [fake_quiz_item]
    mock_db.execute.return_value = mock_res

    questions = await get_quiz_questions(mock_db, count=5)
    assert len(questions) == 1
    q = questions[0]
    assert q["quiz_item_id"] == str(quiz_id)
    assert q["claim_text"] == "Test claim for quiz pool."
    assert "correct_verdict" not in q  # Must NOT reveal answer!


@pytest.mark.asyncio
async def test_submit_quiz_answer_and_weak_label_telemetry():
    quiz_id = uuid.uuid4()
    fake_quiz_item = QuizItem(
        id=quiz_id,
        redacted_claim_text="Test claim for answer submission.",
        correct_verdict="supported",
        explanation_summary="Corroborated evidence.",
        difficulty_tag="medium",
        is_approved=True,
        times_played=4,
        times_correct=3,
    )

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = fake_quiz_item
    mock_db.execute.return_value = mock_res

    res = await submit_quiz_answer(mock_db, quiz_id, user_guess="supported")
    assert res["is_correct"] is True
    assert res["correct_verdict"] == "supported"
    assert res["times_played"] == 5
    assert res["community_accuracy_percent"] == 80.0


@pytest.mark.asyncio
async def test_quiz_admin_curate_api_endpoint_rbac():
    admin_user = make_test_user(role="admin")
    regular_user = make_test_user(role="user")

    async def mock_admin_override():
        return admin_user

    async def mock_user_override():
        return regular_user

    async def mock_db_override():
        db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_res
        yield db

    app.dependency_overrides[get_db] = mock_db_override

    # Test 1: Admin user curation -> 200 OK
    app.dependency_overrides[get_current_user] = mock_admin_override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(
                "/api/v1/quiz/admin/curate",
                json={
                    "redacted_claim_text": "Solar cell 35% efficiency claim.",
                    "correct_verdict": "supported",
                    "explanation_summary": "Verified by independent peer review.",
                    "difficulty_tag": "medium",
                },
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "curated"
            assert "quiz_item_id" in data

        # Test 2: Regular user curation -> 403 Forbidden
        app.dependency_overrides[get_current_user] = mock_user_override
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(
                "/api/v1/quiz/admin/curate",
                json={
                    "redacted_claim_text": "Solar cell 35% efficiency claim.",
                    "correct_verdict": "supported",
                    "explanation_summary": "Verified by independent peer review.",
                },
            )
            assert res.status_code == 403
    finally:
        app.dependency_overrides.clear()
