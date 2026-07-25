from app.models.source import Source
from app.services.linguistic_scorer import (
    analyze_clickbait_and_sensationalism,
    analyze_virality_risk,
)
from app.services.manipulation_detector import detect_manipulation_tactics
from app.services.satire_detector import detect_satire
from app.services.scoring_service import compute_phase3_composite_score
from app.services.temporal_detector import detect_temporal_mismatch


def test_analyze_clickbait_and_sensationalism():
    text = "SHOCKING TRUTH: You won't believe what happens next!! This one simple trick will blow your mind!!"
    res = analyze_clickbait_and_sensationalism(text)
    assert res["clickbait_score"] > 60.0
    assert len(res["found_triggers"]) >= 2


def test_analyze_virality_risk():
    text = "Furious citizens react after terrifying scandal erupts."
    res = analyze_virality_risk(text)
    assert res["virality_score"] > 40.0
    assert res["spread_risk_level"] in ["moderate", "high"]


def test_detect_manipulation_tactics():
    text = "Choice is simple: either you support us now or disaster awaits before it's too late!"
    res = detect_manipulation_tactics(text)
    assert res["tactics_count"] >= 2
    tactics = [t["key"] for t in res["detected_tactics"]]
    assert "false_dichotomy" in tactics
    assert "appeal_to_fear" in tactics


def test_detect_satire_domain():
    res = detect_satire("Headline text", domain="theonion.com")
    assert res["is_satire"] is True
    assert "The Onion" in res["reason"] or "theonion.com" in res["reason"]


def test_detect_temporal_mismatch():
    raw_text = "Events unfolding from 2014 report."
    res = detect_temporal_mismatch(raw_text, [{"title": "2014 event report"}])
    assert res["has_temporal_mismatch"] is True
    assert "2014" in res["notes"]


def test_compute_phase3_composite_score():
    mock_source = Source(
        domain="theonion.com",
        name="The Onion",
        historical_accuracy_score=80.0,
        whois_age_days=3650,
        is_known_satire=True,
        is_known_misinfo=False
    )
    score_res = compute_phase3_composite_score(
        source=mock_source,
        claims=[],
        corroborating_sources=[],
        text_length=200,
        clickbait_data={"clickbait_score": 10.0},
        virality_data={"virality_score": 15.0},
        manipulation_data={"manipulation_score": 0.0, "detected_tactics": []},
        satire_data={"is_satire": True, "reason": "Parody outlet"},
        temporal_data={"temporal_score": 95.0}
    )
    assert score_res["dimension_scores"]["is_satire"] is True
    assert "[SATIRE / PARODY]" in score_res["reasoning_chain"]["summary"]
