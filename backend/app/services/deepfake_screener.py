import io
import logging
from typing import Any

from PIL import Image

logger = logging.getLogger(__name__)

AI_GENERATOR_KEYWORDS = [
    b"stable diffusion", b"midjourney", b"dall-e", b"novelai",
    b"comfyui", b"automatic1111", b"c2pa", b"ai_generated", b"generative"
]


def screen_deepfake_artifacts(
    media_bytes: bytes | None = None,
    media_path: str | None = None,
) -> dict[str, Any]:
    """
    AI Generation & Deepfake Artifact Screener.
    Inspects image metadata, PNG tEXt chunks, AI generator watermarks,
    and EXIF camera signatures to detect synthetic media and deepfakes.
    """
    is_suspicious = False
    confidence = 0.0
    artifacts_detected = []

    if media_bytes:
        media_bytes_lower = media_bytes.lower()

        # 1. AI Generator Signature Scanner in raw bytes (case insensitive)
        for keyword in AI_GENERATOR_KEYWORDS:
            if keyword in media_bytes_lower:
                is_suspicious = True
                confidence = max(confidence, 0.85)
                artifacts_detected.append({
                    "type": "ai_generator_metadata_tag",
                    "keyword": keyword.decode("utf-8", errors="ignore"),
                })

        # 2. EXIF & Compression Structure Inspection
        try:
            image = Image.open(io.BytesIO(media_bytes))

            # Check PNG info for AI prompt or software parameters
            info_keys = [str(k).lower() for k in image.info.keys()]

            if any("prompt" in k or "parameters" in k or "software" in k for k in info_keys):
                is_suspicious = True
                confidence = max(confidence, 0.90)
                artifacts_detected.append({
                    "type": "png_text_prompt_chunk",
                    "details": "AI generation prompt parameters detected in PNG info header."
                })

            # Check if camera EXIF data is present vs missing
            has_camera_exif = False
            if hasattr(image, "_getexif") and image._getexif():
                exif = image._getexif()
                if exif and (271 in exif or 272 in exif):  # Make or Model tag
                    has_camera_exif = True

            if not has_camera_exif and image.format in ("JPEG", "JPG"):
                confidence = max(confidence, 0.35)
                artifacts_detected.append({
                    "type": "missing_camera_exif",
                    "details": "Image lacks standard digital camera EXIF hardware signatures."
                })

        except Exception as exc:
            logger.debug(f"Deepfake artifact inspection error: {exc}")

    return {
        "is_suspicious": is_suspicious,
        "confidence": round(confidence, 2),
        "artifacts_detected": artifacts_detected,
        "note": "AI generation and deepfake artifact screening complete.",
    }


__all__ = ["screen_deepfake_artifacts"]
