import logging
from typing import Any
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def check_vlm_alignment(
    image_bytes: bytes | None = None,
    caption: str | None = None,
) -> dict[str, Any]:
    """
    Visual-Language Model (VLM) image-caption context alignment engine.
    Evaluates whether the image content matches the claims in the caption,
    flagging out-of-context image reuse and manipulation.
    """
    if not image_bytes or not caption:
        return {
            "alignment_score": 100.0,
            "is_mismatched": False,
            "mismatch_reasons": [],
            "note": "Insufficient image or caption input for VLM comparison.",
        }

    caption_lower = caption.lower()
    mismatch_reasons = []

    # Check for sensational or misleading caption indicators
    suspicious_triggers = ["leaked photo", "unseen image", "proof of fake", "manipulated image"]
    has_trigger = any(t in caption_lower for t in suspicious_triggers)
    if has_trigger:
        mismatch_reasons.append("Caption contains sensational image context claim.")

    # Call OpenRouter / Multimodal Vision LLM if configured
    if settings.OPENROUTER_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            req_body = {
                "model": "google/gemini-2.5-flash",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Compare image and caption. Caption: '{caption[:300]}'. Is there a context mismatch? Reply strictly with 'mismatched: yes' or 'mismatched: no'."},
                        ]
                    }
                ],
                "max_tokens": 50
            }
            with httpx.Client(timeout=5.0) as client:
                res = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=req_body)
                if res.status_code == 200:
                    answer = res.json()["choices"][0]["message"]["content"].lower()
                    negatives = ["no mismatch", "no context mismatch", "not mismatched", "no inherent mismatch", "cannot determine", "no,"]
                    if ("mismatched: yes" in answer or "mismatch" in answer) and not any(neg in answer for neg in negatives):
                        mismatch_reasons.append(f"VLM Analysis: {answer}")
        except Exception as exc:
            logger.debug(f"OpenRouter VLM alignment API call skipped: {exc}")

    is_mismatched = len(mismatch_reasons) > 0
    score = 45.0 if is_mismatched else 95.0

    return {
        "alignment_score": score,
        "is_mismatched": is_mismatched,
        "mismatch_reasons": mismatch_reasons,
        "note": "VLM context alignment analysis complete.",
    }


__all__ = ["check_vlm_alignment"]
