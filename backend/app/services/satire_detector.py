import re
from typing import Any

SATIRE_DOMAINS = [
    "theonion.com", "babylonbee.com", "waterfordwhispersnews.com",
    "borowitzreport.com", "harddrive.net", "duffelblog.com",
    "clickhole.com", "thebeaverton.com", "chaser.com.au"
]

SATIRE_KEYWORDS = [
    r"satirical\s+publication",
    r"parody\s+news",
    r"for\s+satirical\s+purposes",
    r"this\s+is\s+a\s+work\tag\s+of\s+satire",
    r"humor\s+and\s+satire"
]


def detect_satire(text: str, domain: str | None = None) -> dict[str, Any]:
    """
    Detects if content originates from a known satire source or contains explicit satire disclaimers.
    """
    if domain:
        clean_domain = domain.lower().replace("www.", "")
        if any(satire in clean_domain for satire in SATIRE_DOMAINS):
            return {
                "is_satire": True,
                "reason": f"Publisher '{domain}' is a recognized satire and parody organization.",
                "satire_label": "Satire / Parody Source"
            }

    lowered = text.lower()
    for pattern in SATIRE_KEYWORDS:
        if re.search(pattern, lowered):
            return {
                "is_satire": True,
                "reason": "Text explicitly contains a satire disclaimer.",
                "satire_label": "Satirical Content"
            }

    return {
        "is_satire": False,
        "reason": "No satire markers detected.",
        "satire_label": "Standard News / Analysis"
    }
