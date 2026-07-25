import logging
import re

import httpx

from app.core.config import settings
from app.schemas.claim import ExtractedClaimItem, ExtractedClaimsList

logger = logging.getLogger(__name__)


def sanitize_prompt_injection(raw_text: str) -> str:
    """
    Defense shield against prompt injection attempts in raw user input.
    Strips known adversarial override patterns before sending to LLM.
    """
    adversarial_patterns = [
        r"ignore\s+(all\s+)?previous\s+instructions",
        r"system\s+prompt\s*:",
        r"you\s+are\s+now\s+a",
        r"disregard\s+above",
        r"override\s+instructions"
    ]
    sanitized = raw_text
    for pattern in adversarial_patterns:
        sanitized = re.sub(pattern, "[redacted_prompt_injection]", sanitized, flags=re.IGNORECASE)
    return sanitized


def heuristic_claim_extractor(text: str) -> list[ExtractedClaimItem]:
    """
    Deterministic fallback heuristic that parses text into verifiable factual sentences.
    Ensures pipeline functions smoothly offline and in testing environments.
    """
    sentences = [s.strip() for s in re.split(r'[.!?]\s+', text) if len(s.strip()) > 15]
    claims: list[ExtractedClaimItem] = []

    for sentence in sentences[:5]:
        claims.append(ExtractedClaimItem(
            claim_text=sentence,
            extracted_speaker=None,
            topic_category="general"
        ))

    if not claims and text.strip():
        claims.append(ExtractedClaimItem(
            claim_text=text.strip()[:200],
            extracted_speaker=None,
            topic_category="general"
        ))

    return claims


async def extract_claims_from_text(text: str) -> list[ExtractedClaimItem]:
    """
    Extracts explicit, verifiable factual assertions from article body or text payload.
    Uses OpenRouter/Groq LLM structured outputs with fallbacks.
    """
    clean_text = sanitize_prompt_injection(text)
    if not clean_text.strip():
        return []

    # Attempt LLM extraction if OpenRouter or Groq API key is present
    api_key = settings.OPENROUTER_API_KEY or settings.GROQ_API_KEY
    if api_key and not api_key.startswith("your_"):
        try:
            url = "https://openrouter.ai/api/v1/chat/completions" if settings.OPENROUTER_API_KEY else "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            prompt = (
                "You are Credo's factual assertion extractor. Extract distinct, verifiable factual claims from the following text.\n"
                "Return a JSON object matching this schema:\n"
                '{"claims": [{"claim_text": "...", "extracted_speaker": "...", "topic_category": "..."}]}\n\n'
                f"TEXT:\n{clean_text[:2000]}"
            )
            payload = {
                "model": "meta-llama/llama-3-70b-instruct" if settings.OPENROUTER_API_KEY else "llama3-70b-8192",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = ExtractedClaimsList.model_validate_json(content)
                    if parsed.claims:
                        logger.info(f"Extracted {len(parsed.claims)} claims via LLM")
                        return parsed.claims
        except Exception as e:
            logger.warning(f"LLM claim extraction failed, falling back to heuristic: {e!s}")

    # Fallback to heuristic sentence parsing
    return heuristic_claim_extractor(clean_text)
