import logging
from importlib import import_module

import pytest

pytest.importorskip("app.services.c2pa_provenance")
pytest.importorskip("app.services.deepfake_screener")
pytest.importorskip("app.services.media_preprocessor")
pytest.importorskip("app.services.media_transcription")
pytest.importorskip("app.services.pii_redactor")
pytest.importorskip("app.services.social_post_parser")

from app.services.c2pa_provenance import extract_c2pa_provenance  # noqa: E402
from app.services.deepfake_screener import screen_deepfake_artifacts  # noqa: E402
from app.services.media_preprocessor import (  # noqa: E402
    fetch_image_bytes,
    preprocess_image_payload,
)
from app.services.media_transcription import transcribe_media  # noqa: E402
from app.services.pii_redactor import redact_pii  # noqa: E402
from app.services.social_post_parser import _detect_platform, parse_social_post  # noqa: E402

logging.disable(logging.CRITICAL)

try:
    from app.services.image_reverse_search import reverse_image_search  # noqa: E402

    HAS_REVERSE_SEARCH = True
except ImportError:
    HAS_REVERSE_SEARCH = False

try:
    from app.services.ocr_service import extract_text_from_image  # noqa: E402

    HAS_OCR = True
except ImportError:
    HAS_OCR = False


class TestMediaTranscription:
    def test_transcribe_media_returns_string(self):
        import asyncio

        result = asyncio.run(transcribe_media("some media payload"))
        assert isinstance(result, str)

    def test_transcribe_media_falls_back_to_raw_payload(self):
        import asyncio

        payload = "raw media payload"
        result = asyncio.run(transcribe_media(payload))
        assert result == payload


class TestPiiRedactor:
    def test_redact_email(self):
        assert "[REDACTED_EMAIL]" in redact_pii("Contact me at james@example.com")

    def test_redact_phone(self):
        assert "[REDACTED_PHONE]" in redact_pii("Call +234 803 123 4567")

    def test_redact_ip(self):
        assert "[REDACTED_IP]" in redact_pii("Server IP is 192.168.1.1")

    def test_redact_address(self):
        assert "[REDACTED_ADDRESS]" in redact_pii("123 Main Street")

    def test_redact_empty_string(self):
        assert redact_pii("") == ""

    def test_redact_none(self):
        assert redact_pii(None) is None


class TestDeepfakeScreener:
    def test_screen_deepfake_artifacts_returns_dict(self):
        result = screen_deepfake_artifacts()
        assert isinstance(result, dict)
        assert "is_suspicious" in result
        assert "confidence" in result
        assert "artifacts_detected" in result


class TestSocialPostParser:
    def test_detect_twitter_platform(self):
        assert _detect_platform("https://twitter.com/user/status/123") == "twitter"

    def test_detect_x_platform(self):
        assert _detect_platform("https://x.com/user/status/123") == "x"

    def test_detect_reddit_platform(self):
        assert (
            _detect_platform("https://www.reddit.com/r/python/comments/abc123/")
            == "reddit"
        )

    def test_parse_social_post_url(self):
        result = parse_social_post("https://twitter.com/user/status/123")
        assert result["platform"] == "twitter"
        assert "twitter" in result["text"]
        assert result["domain"] == "twitter.com"

    def test_parse_social_post_plain_text(self):
        result = parse_social_post("Just a regular post")
        assert result["platform"] is None
        assert result["text"] == "Just a regular post"
        assert result["domain"] is None


class TestC2paProvenance:
    def test_extract_c2pa_provenance_returns_dict(self):
        result = extract_c2pa_provenance()
        assert isinstance(result, dict)
        assert "has_c2pa_manifest" in result
        assert result["has_c2pa_manifest"] is False


class TestMediaPreprocessor:
    def test_preprocess_image_payload_none(self):
        import asyncio

        result = asyncio.run(preprocess_image_payload(""))
        assert result is None

    def test_fetch_image_bytes_invalid_base64(self):
        import asyncio

        result = asyncio.run(fetch_image_bytes("not-valid-base64!!!"))
        assert result is None


@pytest.mark.skipif(not HAS_OCR, reason="Pillow not installed")
class TestOcrService:
    def test_extract_text_from_image_returns_string(self):
        result = extract_text_from_image(b"")
        assert isinstance(result, str)

    def test_extract_text_from_image_empty_bytes(self):
        result = extract_text_from_image(b"")
        assert result == ""


@pytest.mark.skipif(not HAS_REVERSE_SEARCH, reason="reverse_image_search not available")
class TestImageReverseSearch:
    def test_reverse_image_search_no_input(self):
        import asyncio

        result = asyncio.run(reverse_image_search())
        assert isinstance(result, dict)
        assert "matches" in result
