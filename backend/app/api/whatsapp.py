import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.content_item import ContentItem
from app.services.media_transcription import transcribe_audio_voice_note
from app.services.claim_verifier import verify_and_create_claim
from app.services.receipt_service import issue_receipt
from app.schemas.claim import ExtractedClaimItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/whatsapp", tags=["WhatsApp Webhook"])


class WhatsAppVoiceNotePayload(BaseModel):
    sender_phone: str = Field(..., json_schema_extra={"example": "+2348012345678"}, alias="From")
    audio_url: str = Field(..., json_schema_extra={"example": "https://api.whatsapp.com/media/123.mp3"}, alias="MediaUrl")
    content_type: str | None = Field("audio/mpeg", alias="MediaContentType")


def format_whatsapp_compact_summary(
    content_item: ContentItem,
    claim_text: str,
    verdict: str,
    composite_score: float,
    receipt_slug: str | None = None,
    language_code: str = "en",
    multiple_voices: bool = False,
) -> str:
    """
    Formats a compact low-bandwidth text summary suitable for WhatsApp / SMS text responses.
    Includes verdict, main claim, speaker metadata, and signed receipt link.
    """
    verdict_label = (
        "HIGHLY CREDIBLE"
        if verdict == "supported" or composite_score >= 75
        else "CONTRADICTED / DISPUTED"
        if verdict == "contradicted" or composite_score < 40
        else "UNVERIFIED"
    )

    voices_info = "Multiple voices" if multiple_voices else "Single speaker"
    receipt_url_line = (
        f"\nSigned Receipt: https://credo.app/api/v1/receipts/{receipt_slug}"
        if receipt_slug
        else ""
    )

    return (
        f"🎙️ Credo Voice Note Fact-Check\n\n"
        f"VERDICT: {verdict_label} ({composite_score:.1f}/100)\n"
        f"Claim: \"{claim_text}\"\n"
        f"Speakers: {voices_info} (Lang: {language_code.upper()})\n"
        f"{receipt_url_line}"
    )


@router.post("/voice-note")
async def handle_whatsapp_voice_note(
    payload: WhatsAppVoiceNotePayload,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    WhatsApp Voice Note Webhook Handler:
    1. Responds immediately with acknowledgment ("🎙️ Voice note received!").
    2. Transcribes voice note via Whisper API.
    3. Runs claim verification pipeline.
    4. Issues signed credibility receipt.
    5. Returns compact low-bandwidth summary payload.
    """
    import hashlib

    if not payload.audio_url:
        raise HTTPException(status_code=400, detail="Missing audio_url parameter")

    # 1. Immediate acknowledgment message
    acknowledgment = (
        f"🎙️ Voice note received from {payload.sender_phone}! "
        "Processing transcription & claim verification pipeline..."
    )

    # 2. Transcribe voice note & extract metadata
    transcription_data = await transcribe_audio_voice_note(payload.audio_url)
    transcript_text = transcription_data["transcript"]

    # 3. Create ContentItem for voice note
    item_id = uuid.uuid4()
    content_hash_val = hashlib.sha256(payload.audio_url.encode("utf-8")).hexdigest()

    content_item = ContentItem(
        id=item_id,
        user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),  # System WhatsApp bot user ID
        modality="audio",
        url=payload.audio_url,
        title=f"WhatsApp Voice Note ({payload.sender_phone})",
        content_hash=content_hash_val,
        raw_payload=payload.audio_url,
        extracted_text=transcript_text,
        status="complete",
    )
    db.add(content_item)
    await db.flush()

    # 4. Verify claim extracted from transcript
    first_sentence = transcript_text.split(".")[0] if transcript_text else "Voice note audio claim"
    extracted = ExtractedClaimItem(
        claim_text=first_sentence[:200],
        extracted_speaker=f"Voice Note ({payload.sender_phone})",
    )
    claim = await verify_and_create_claim(db, content_item.id, extracted)

    # 5. Issue signed credibility receipt
    receipt = await issue_receipt(db, content_item.id)
    receipt_slug = receipt.public_slug if receipt else None

    # 6. Format compact low-bandwidth WhatsApp text summary
    composite_score = claim.confidence_score if claim else 50.0
    compact_summary = format_whatsapp_compact_summary(
        content_item=content_item,
        claim_text=claim.claim_text if claim else "Audio statement",
        verdict=claim.verdict if claim else "unverified",
        composite_score=composite_score,
        receipt_slug=receipt_slug,
        language_code=transcription_data["language_detected"],
        multiple_voices=transcription_data["multiple_voices_detected"],
    )

    await db.commit()

    return {
        "status": "success",
        "acknowledgment": acknowledgment,
        "content_item_id": str(content_item.id),
        "transcript_data": transcription_data,
        "verdict": claim.verdict if claim else "unverified",
        "composite_score": composite_score,
        "receipt_slug": receipt_slug,
        "whatsapp_compact_summary": compact_summary,
    }
