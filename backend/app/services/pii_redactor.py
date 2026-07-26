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
    # Names (very crude: capitalized Word Word — run last as it is noisy)
    (re.compile(r"\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b"), "[REDACTED_NAME]")
]


def redact_pii(text: str) -> str:
    """Redact common PII from a text blob.

    This is intentionally conservative and heuristic-driven. It should run
    before any external API call or persistent storage of raw user input.
    """
    if not text:
        return text

    redacted = text
    # Apply strict patterns first, leave noisy name redaction for last
    for pattern, token in PII_PATTERNS[:-1]:
        redacted = pattern.sub(token, redacted)

    # Name redaction: only redact when it's likely to be a person (two capitalized words)
    name_pattern, name_token = PII_PATTERNS[-1]
    # Avoid redacting start of sentences by requiring a space before name
    redacted = re.sub(r"(?<=\s)" + name_pattern.pattern, name_token, redacted)

    return redacted


__all__ = ["redact_pii"]
