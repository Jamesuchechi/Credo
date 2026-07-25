import re
from typing import Any

CLICKBAIT_TRIGGERS = [
    r"you\s+won['’]?t\s+believe",
    r"shocking\s+(truth|secret|revelation)",
    r"what\s+happens\s+next",
    r"secret\s+(they|doctors|experts)\s+don['’]?t\s+want\s+you\s+to\s+know",
    r"miracle\s+(cure|remedy|solution)",
    r"blow\s+your\s+mind",
    r"mind[- ]blowing",
    r"number\s+\d+\s+will\s+(shock|amaze)\s+you",
    r"everything\s+you\s+know\s+about\s+.*\s+is\s+a\s+lie",
    r"this\s+one\s+simple\s+trick"
]

EMOTIONAL_AROUSAL_WORDS = [
    "furious", "outrageous", "terrifying", "devastating", "horrifying",
    "disastrous", "treason", "evil", "scandal", "catastrophe", "panic",
    "frightening", "disgrace", "shameful", "outrage", "blood"
]


def analyze_clickbait_and_sensationalism(text: str) -> dict[str, Any]:
    """
    Analyzes text for clickbait indicators, ALL-CAPS exaggeration, and punctuation density.
    """
    if not text.strip():
        return {"clickbait_score": 0.0, "sensationalism_score": 0.0, "triggers": []}

    words = text.split()
    total_words = max(len(words), 1)

    # 1. Clickbait trigger detection
    found_triggers: list[str] = []
    for pattern in CLICKBAIT_TRIGGERS:
        if re.search(pattern, text, re.IGNORECASE):
            found_triggers.append(pattern.replace(r"\s+", " ").replace("\\", ""))

    # 2. ALL-CAPS word ratio (words longer than 2 chars)
    caps_words = [w for w in words if len(w) > 2 and w.isupper()]
    caps_ratio = len(caps_words) / total_words

    # 3. Exaggerated Punctuation Density (!! or ??)
    exclamation_count = text.count("!") + text.count("?")
    punct_density = exclamation_count / total_words

    # Calculate Clickbait Score (0 to 100)
    trigger_score = min(len(found_triggers) * 35.0, 70.0)
    caps_score = min(caps_ratio * 150.0, 30.0)
    clickbait_score = min(trigger_score + caps_score, 100.0)

    # Calculate Sensationalism Score (0 to 100)
    sensationalism_score = min((caps_ratio * 100.0) + (punct_density * 80.0) + (len(found_triggers) * 20.0), 100.0)

    return {
        "clickbait_score": round(clickbait_score, 1),
        "sensationalism_score": round(sensationalism_score, 1),
        "found_triggers": found_triggers
    }


def analyze_virality_risk(text: str) -> dict[str, Any]:
    """
    Calculates virality and emotional spread risk based on high-arousal language.
    """
    lowered = text.lower()
    found_words = [w for w in EMOTIONAL_AROUSAL_WORDS if w in lowered]
    
    # Emotional score based on keyword frequency
    arousal_score = min(len(found_words) * 22.0, 100.0)
    
    risk_level = "low"
    if arousal_score >= 70.0:
        risk_level = "high"
    elif arousal_score >= 40.0:
        risk_level = "moderate"

    return {
        "virality_score": round(arousal_score, 1),
        "emotional_words": found_words,
        "spread_risk_level": risk_level
    }
