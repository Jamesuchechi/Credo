import re


PII_PATTERNS = [
    # Emails
    (re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"), "[REDACTED_EMAIL]"),
    # Phone numbers (simple international/local variants)
    (re.compile(r"\+?\d[\d \-()]{7,}\d"), "[REDACTED_PHONE]"),
    # IPv4
    (re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"), "[REDACTED_IP]"),
    # Simple address-ish patterns (number + street)
    (re.compile(r"\b\d{1,6}\s+([A-Za-z0-9]+\s){0,4}(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Boulevard|Blvd)\b", re.IGNORECASE), "[REDACTED_ADDRESS]"),
]


def redact_pii(text: str) -> str:
    """Redact sensitive private credentials (emails, phones, IPs, addresses) from a text blob.

    Preserves proper nouns, names, and public figures necessary for multi-modal claim analysis.
    """
    if not text:
        return text

    redacted = text
    for pattern, token in PII_PATTERNS:
        redacted = pattern.sub(token, redacted)

    return redacted


__all__ = ["redact_pii"]
