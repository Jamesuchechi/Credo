import logging
from typing import Any

logger = logging.getLogger(__name__)


def extract_c2pa_provenance(
    media_bytes: bytes | None = None,
    media_path: str | None = None,
) -> dict[str, Any]:
    """Minimal C2PA / Content Credentials provenance extraction.

    This placeholder preserves the ingestion flow and returns an empty
    provenance record. In production this would use a C2PA library or
    cloud metadata service to inspect manifests and digital signatures.
    """
    logger.debug("C2PA provenance extraction requested (placeholder)")
    return {
        "has_c2pa_manifest": False,
        "provenance": [],
        "edits_detected": False,
        "note": "Placeholder C2PA extraction — no manifest parser wired yet",
    }


__all__ = ["extract_c2pa_provenance"]
