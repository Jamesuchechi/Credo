import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.claim_clustering_service import get_claim_mutation_chain

router = APIRouter(tags=["Claims"])


@router.get("/claims/{claim_id}/mutation-chain")
async def get_claim_mutation_chain_endpoint(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Returns the full mutation chain lineage ("telephone game" drift) for a claim.
    Includes chronological variant nodes, word-level diffs, verdict progression, and origin disclaimer.
    """
    chain = await get_claim_mutation_chain(db, claim_id)
    if not chain:
        raise HTTPException(status_code=404, detail="Claim or mutation chain not found")
    return chain


@router.post("/claims/{claim_id}/debate")
async def trigger_claim_debate_endpoint(
    claim_id: uuid.UUID,
    swap_order: bool = Query(False, description="Swap prompt order for order-bias verification"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Triggers Advocate/Skeptic 3-pass Debate Mode verification for a claim.
    Enforces user daily LLM spend limit ($5.00 USD).
    """
    from app.services.claim_verifier import run_debate_mode_verification
    return await run_debate_mode_verification(db, current_user.id, claim_id, swap_order=swap_order)
