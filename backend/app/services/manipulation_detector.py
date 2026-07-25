import re
from typing import Any

MANIPULATION_PATTERNS = {
    "false_dichotomy": {
        "label": "False Dichotomy",
        "patterns": [
            r"either\s+.*?\s+or\s+",
            r"if\s+you['’]?re\s+not\s+(with|for)\s+us",
            r"choice\s+is\s+simple:\s+either",
            r"you\s+must\s+choose\s+between"
        ],
        "description": "Presents a complex issue as having only two extreme options."
    },
    "appeal_to_fear": {
        "label": "Appeal to Fear & Urgency",
        "patterns": [
            r"before\s+it['’]?s\s+too\s+late",
            r"imminent\s+(threat|disaster|collapse|destruction)",
            r"dire\s+consequences",
            r"catastrophe\s+awaits",
            r"armageddon"
        ],
        "description": "Exploits anxiety or panic to force immediate agreement without evidence."
    },
    "ad_hominem": {
        "label": "Ad Hominem Attack",
        "patterns": [
            r"corrupt\s+(liar|politician|hack|clown)",
            r"disgraceful\s+(individual|puppet|media)",
            r"traitor(ous)?\s+",
            r"evil\s+agenda"
        ],
        "description": "Attacks the character or motives of a person rather than addressing arguments."
    }
}


def detect_manipulation_tactics(text: str) -> dict[str, Any]:
    """
    Scans input text for manipulative rhetorical tactics and logical fallacies.
    """
    detected_tactics: list[dict[str, str]] = []
    total_score = 0.0

    for key, config in MANIPULATION_PATTERNS.items():
        matched = False
        for pattern in config["patterns"]:
            if re.search(pattern, text, re.IGNORECASE):
                matched = True
                break
        
        if matched:
            detected_tactics.append({
                "key": key,
                "label": config["label"],
                "description": config["description"]
            })
            total_score += 30.0

    overall_manipulation_score = min(total_score, 100.0)

    return {
        "manipulation_score": round(overall_manipulation_score, 1),
        "detected_tactics": detected_tactics,
        "tactics_count": len(detected_tactics)
    }
