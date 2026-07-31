import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.services.claim_clustering_service import cosine_similarity, find_related_claims
from app.services.embedding_service import deterministic_text_embedding, embed_claim_text


def test_deterministic_text_embedding():
    v1 = deterministic_text_embedding("Electric vehicles reduce carbon emissions in urban centers.")
    v2 = deterministic_text_embedding("Electric vehicles reduce carbon emissions significantly in cities.")
    v3 = deterministic_text_embedding("Baking chocolate chip cookies requires flour, butter, and sugar.")

    assert len(v1) == 384
    sim1_2 = cosine_similarity(v1, v2)
    sim1_3 = cosine_similarity(v1, v3)

    assert sim1_2 > sim1_3
    assert sim1_2 > 0.15


@pytest.mark.asyncio
async def test_find_related_claims():
    mock_db = AsyncMock()

    target_id = uuid.uuid4()
    item_id_1 = uuid.uuid4()
    item_id_2 = uuid.uuid4()

    target_claim = Claim(
        id=target_id,
        content_item_id=item_id_1,
        claim_text="Solar panel efficiency increased by 30% in 2026 tests.",
        verdict="supported",
        confidence_score=88.0,
        created_at=datetime.utcnow()
    )
    target_claim.embedding = await embed_claim_text(target_claim.claim_text)

    related_claim = Claim(
        id=uuid.uuid4(),
        content_item_id=item_id_2,
        claim_text="Solar panel efficiency increased by 30% in lab tests.",
        verdict="supported",
        confidence_score=90.0,
        created_at=datetime.utcnow()
    )
    related_claim.embedding = await embed_claim_text(related_claim.claim_text)

    related_item = ContentItem(
        id=item_id_2,
        user_id=uuid.uuid4(),
        modality="text",
        content_hash="hash2",
        raw_payload="Payload text",
        status="complete",
        created_at=datetime.utcnow()
    )

    mock_target_res = MagicMock()
    mock_target_res.scalar_one_or_none.return_value = target_claim

    mock_cand_res = MagicMock()
    mock_cand_res.all.return_value = [(related_claim, related_item)]

    mock_db.execute.side_effect = [mock_target_res, mock_cand_res]

    matches = await find_related_claims(mock_db, target_id, limit=5, similarity_threshold=0.15)

    assert len(matches) == 1
    assert matches[0]["claim_id"] == str(related_claim.id)
    assert matches[0]["content_id"] == str(item_id_2)
    assert matches[0]["similarity_score"] >= 0.15
