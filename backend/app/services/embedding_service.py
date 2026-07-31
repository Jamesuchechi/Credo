import hashlib
import logging
import math
import re

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def deterministic_text_embedding(text: str, dim: int = 384) -> list[float]:
    """
    Fallback deterministic sentence embedding vector generator for offline,
    testing, and zero-API cost environments. Maps subwords and n-grams into a unit-normalized vector.
    """
    clean = re.sub(r"[^\w\s]", "", text.lower()).strip()
    words = clean.split()

    vector = [0.0] * dim

    if not words:
        return vector

    # Build features: words, word bigrams, and char 3-grams/4-grams for subword similarity
    features = list(words)
    for i in range(len(words) - 1):
        features.append(f"{words[i]}_{words[i+1]}")

    for word in words:
        padded = f"#{word}#"
        for n in (3, 4):
            for i in range(len(padded) - n + 1):
                features.append(padded[i : i + n])

    for feat in features:
        h_val = int(hashlib.md5(feat.encode("utf-8")).hexdigest(), 16)
        index = h_val % dim
        sign = 1.0 if (h_val & 1) else -1.0
        vector[index] += sign

    # Unit L2 normalization
    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]

    return vector


async def embed_claim_text(claim_text: str, dim: int = 384) -> list[float]:
    """
    Generates a 384-dimensional vector embedding for a claim text string.
    Uses OpenRouter embeddings API when available, or falls back to deterministic vectorizer.
    """
    if not claim_text.strip():
        return [0.0] * dim

    if settings.OPENROUTER_API_KEY and not settings.OPENROUTER_API_KEY.startswith("your_"):
        try:
            url = "https://openrouter.ai/api/v1/embeddings"
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "baai/bge-small-en-v1.5",
                "input": claim_text[:512],
            }

            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    embedding = data.get("data", [{}])[0].get("embedding", [])
                    if embedding:
                        # Slice or adjust dimension if needed
                        return embedding[:dim] if len(embedding) >= dim else embedding + [0.0] * (dim - len(embedding))
        except Exception as e:
            logger.warning(f"OpenRouter embedding API failed, falling back to deterministic vectorizer: {e!s}")

    return deterministic_text_embedding(claim_text, dim=dim)


__all__ = [
    "deterministic_text_embedding",
    "embed_claim_text",
]
