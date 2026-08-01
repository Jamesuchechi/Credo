import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.models.user import User
from app.services.claim_clustering_service import (
    assign_claim_parent,
    compute_word_diff,
    find_candidate_parent,
    get_claim_mutation_chain,
)


def make_test_user():
    return User(
        id=uuid.uuid4(),
        email="mutation_tester@example.com",
        hashed_password="hashed_pass",
        full_name="Mutation Tester",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


def test_compute_word_diff_tokens():
    parent = "Scientists discover new solar cell material"
    child = "Engineers discover new super solar cell material"
    diff = compute_word_diff(parent, child)

    assert isinstance(diff, list)
    types = [t["type"] for t in diff]
    words = [t["text"] for t in diff]

    assert "equal" in types
    assert "added" in types
    assert "discover" in words
    assert "super" in words


@pytest.mark.asyncio
async def test_find_candidate_parent_selection():
    item_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    parent_claim = Claim(
        id=uuid.uuid4(),
        content_item_id=item_id,
        claim_text="Bridge inspection scheduled after storm",
        created_at=now - timedelta(days=2),
    )

    child_claim = Claim(
        id=uuid.uuid4(),
        content_item_id=item_id,
        claim_text="Bridge inspection scheduled after major severe storm",
        created_at=now,
    )

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars().all.return_value = [parent_claim]
    mock_db.execute.return_value = mock_res

    # Mock embedding similarity to return 0.85
    with patch("app.services.claim_clustering_service.embed_claim_text", new_callable=AsyncMock) as mock_embed:
        mock_embed.return_value = [0.1, 0.2, 0.3]
        with patch("app.services.claim_clustering_service.cosine_similarity", return_value=0.85):
            found_parent, mut_score = await find_candidate_parent(mock_db, child_claim)

            assert found_parent is not None
            assert found_parent.id == parent_claim.id
            assert mut_score == 0.15


@pytest.mark.asyncio
async def test_get_claim_mutation_chain_building():
    item_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    root_id = uuid.uuid4()
    child_id = uuid.uuid4()

    root_claim = Claim(
        id=root_id,
        content_item_id=item_id,
        claim_text="Breakthrough solar cell tested",
        verdict="supported",
        confidence_score=90.0,
        parent_claim_id=None,
        created_at=now - timedelta(days=5),
    )

    child_claim = Claim(
        id=child_id,
        content_item_id=item_id,
        claim_text="Breakthrough solar cell achieves 99% efficiency",
        verdict="contradicted",
        confidence_score=85.0,
        parent_claim_id=root_id,
        mutation_score=0.25,
        created_at=now,
    )

    fake_item = ContentItem(
        id=item_id,
        user_id=uuid.uuid4(),
        modality="text",
        raw_payload="payload",
        content_hash="hash",
        title="Solar Test",
    )

    mock_db = AsyncMock()

    # Query target claim -> child_claim
    mock_res_target = MagicMock()
    mock_res_target.scalar_one_or_none.return_value = child_claim

    # Query parent claim -> root_claim
    mock_res_root = MagicMock()
    mock_res_root.scalar_one_or_none.return_value = root_claim

    # Query all claims -> [(root_claim, fake_item), (child_claim, fake_item)]
    mock_res_all = MagicMock()
    mock_res_all.all.return_value = [(root_claim, fake_item), (child_claim, fake_item)]

    mock_db.execute.side_effect = [mock_res_target, mock_res_root, mock_res_all]

    chain = await get_claim_mutation_chain(mock_db, child_id)

    assert chain is not None
    assert chain["target_claim_id"] == str(child_id)
    assert chain["root_claim_id"] == str(root_id)
    assert chain["chain_length"] == 2
    assert "earliest variant indexed" in chain["origin_disclaimer"].lower()
    assert len(chain["nodes"]) == 2
    assert chain["nodes"][0]["is_root"] is True
    assert chain["nodes"][1]["is_target"] is True


@pytest.mark.asyncio
async def test_claim_mutation_chain_api_endpoint():
    test_user = make_test_user()
    claim_id = uuid.uuid4()

    fake_chain = {
        "target_claim_id": str(claim_id),
        "root_claim_id": str(claim_id),
        "origin_disclaimer": "Credo Origin Notice: Root represents earliest indexed entry.",
        "chain_length": 1,
        "nodes": [
            {
                "claim_id": str(claim_id),
                "content_item_id": str(uuid.uuid4()),
                "claim_text": "Sample claim text",
                "verdict": "supported",
                "confidence_score": 90.0,
                "is_target": True,
                "is_root": True,
                "diff_from_parent": [{"text": "Sample claim text", "type": "added"}],
            }
        ],
    }

    async def mock_user_override():
        return test_user

    async def mock_db_override():
        db = AsyncMock()
        yield db

    app.dependency_overrides[get_current_user] = mock_user_override
    app.dependency_overrides[get_db] = mock_db_override

    try:
        with patch("app.api.claims.get_claim_mutation_chain", new_callable=AsyncMock) as mock_service:
            mock_service.return_value = fake_chain

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                res = await ac.get(f"/api/v1/claims/{claim_id}/mutation-chain")
                assert res.status_code == 200
                data = res.json()
                assert data["target_claim_id"] == str(claim_id)
                assert data["chain_length"] == 1
                assert "earliest indexed" in data["origin_disclaimer"].lower()
    finally:
        app.dependency_overrides.clear()
