import logging
from typing import Any

logger = logging.getLogger(__name__)


def check_vlm_alignment(
    image_bytes: bytes | None = None,
    caption: str | None = None,
) -> dict[str, Any]:
    """Minimal VLM image-caption context alignment check.

    This placeholder preserves the ingestion flow. In production this
    would call a VLM endpoint (or local model) to compare the image
    content against the supplied caption/text and flag mismatches.
    """
    logger.debug("VLM alignment check requested (placeholder)")
    return {
        "alignment_score": None,
        "is_mismatched": False,
        "mismatch_reasons": [],
        "note": "Placeholder VLM alignment — no model wired yet",
    }


__all__ = ["check_vlm_alignment"]
