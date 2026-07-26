import logging
from typing import Any

logger = logging.getLogger(__name__)


def screen_deepfake_artifacts(
    media_bytes: bytes | None = None,
    media_path: str | None = None,
) -> dict[str, Any]:
    """Minimal deepfake artifact screening heuristics.

    This is a lightweight placeholder for Step 4 completion. In production
    this would call an open-model endpoint (e.g. face-verification or
    audio-sync model). Here we return a conservative default that keeps
    the pipeline functional without fabricating a score.
    """
    logger.debug("Deepfake artifact screening requested (placeholder)")
    return {
        "is_suspicious": False,
        "confidence": 0.0,
        "artifacts_detected": [],
        "note": "Placeholder deepfake screen — no artifact model wired yet",
    }


__all__ = ["screen_deepfake_artifacts"]
