import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import get_db
from app.main import app
from app.models.claim import Claim
from app.models.content_item import ContentItem
from app.models.credibility_receipt import CredibilityReceipt
from app.services.media_transcription import (
    detect_language_code,
    detect_multi_speaker_diarization_heuristic,
    transcribe_audio_voice_note,
)
from app.api.whatsapp import format_whatsapp_compact_summary


def test_detect_multi_speaker_diarization_heuristic():
    single_speaker_text = "Today the minister announced new budget allocations for schools."
    is_multi, count = detect_multi_speaker_diarization_heuristic(single_speaker_text)
    assert is_multi is False
    assert count == 1

    dialogue_text = "Speaker 1: Are you sure about the numbers?\nSpeaker 2: Yes, he said 50 million naira."
    is_multi, count = detect_multi_speaker_diarization_heuristic(dialogue_text)
    assert is_multi is True
    assert count >= 2


def test_detect_language_code():
    pidgin_text = "Abi you dey see am? No be so we talk am, abeg leave dis girl."
    lang_code, warning = detect_language_code(pidgin_text)
    assert lang_code == "pcm"
    assert warning is not None
    assert "Pidgin" in warning

    yoruba_text = "Eku oso, bawo ni seun loran pelu wa."
    lang_code, warning = detect_language_code(yoruba_text)
    assert lang_code == "yo"

    english_text = "The quick brown fox jumps over the lazy dog."
    lang_code, warning = detect_language_code(english_text)
    assert lang_code == "en"
    assert warning is None


def test_format_whatsapp_compact_summary():
    item = ContentItem(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        modality="audio",
        url="https://example.com/audio.mp3",
        title="WhatsApp Voice Note",
    )

    summary = format_whatsapp_compact_summary(
        content_item=item,
        claim_text="Lab achieved 35% solar efficiency.",
        verdict="supported",
        composite_score=88.5,
        receipt_slug="HsKfAsm7VYG",
        language_code="en",
        multiple_voices=False,
    )

    assert "🎙️ Credo Voice Note Fact-Check" in summary
    assert "HIGHLY CREDIBLE (88.5/100)" in summary
    assert "HsKfAsm7VYG" in summary
    assert "Single speaker" in summary


@pytest.mark.asyncio
async def test_transcribe_audio_voice_note_logic():
    audio_url = "https://example.com/voice_note.mp3"

    with patch("app.services.media_transcription.transcribe_media", new_callable=AsyncMock) as mock_transcribe:
        mock_transcribe.return_value = "Abi you dey hear am? Speaker 1: he said wey 50 percent."

        res = await transcribe_audio_voice_note(audio_url)
        assert res["multiple_voices_detected"] is True
        assert res["language_detected"] == "pcm"
        assert res["raw_audio_url"] == audio_url
        assert "Multiple voices detected" in res["transcript"]


@pytest.mark.asyncio
async def test_whatsapp_voice_note_webhook_api():
    item_id = uuid.uuid4()
    audio_url = "https://example.com/voice_note_test.mp3"

    fake_claim = Claim(
        id=uuid.uuid4(),
        content_item_id=item_id,
        claim_text="Voice note claim test",
        verdict="supported",
        confidence_score=90.0,
        evidence_summary="Verified",
        created_at=datetime.now(timezone.utc),
    )

    fake_receipt = CredibilityReceipt(
        id=uuid.uuid4(),
        content_item_id=item_id,
        public_slug="HsKfAsm7VYG",
        verdict_summary={"composite_score": 90.0},
        signature="signature_hash",
        issued_at=datetime.now(timezone.utc),
    )

    async def mock_db_override():
        db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_res
        yield db

    app.dependency_overrides[get_db] = mock_db_override

    try:
        with patch("app.api.whatsapp.transcribe_audio_voice_note", new_callable=AsyncMock) as mock_transcribe:
            mock_transcribe.return_value = {
                "transcript": "Test audio transcript.",
                "language_detected": "en",
                "language_warning": None,
                "multiple_voices_detected": False,
                "speakers_count": 1,
                "raw_audio_url": audio_url,
            }

            with patch("app.api.whatsapp.verify_and_create_claim", new_callable=AsyncMock) as mock_claim:
                mock_claim.return_value = fake_claim

                with patch("app.api.whatsapp.issue_receipt", new_callable=AsyncMock) as mock_receipt:
                    mock_receipt.return_value = fake_receipt

                    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                        res = await ac.post(
                            "/api/v1/webhooks/whatsapp/voice-note",
                            json={"From": "+2348012345678", "MediaUrl": audio_url},
                        )
                        assert res.status_code == 200
                        data = res.json()
                        assert data["status"] == "success"
                        assert "acknowledgment" in data
                        assert "🎙️ Voice note received" in data["acknowledgment"]
                        assert "whatsapp_compact_summary" in data
                        assert "HsKfAsm7VYG" in data["whatsapp_compact_summary"]
    finally:
        app.dependency_overrides.clear()
