from app.models.source import Source
from app.services.source_reputation_service import calculate_source_reputation_score
from app.services.whois_service import extract_domain


def test_extract_domain():
    assert extract_domain("https://www.reuters.com/world/africa") == "reuters.com"
    assert extract_domain("http://news.bbc.co.uk/1/hi/default.stm") == "bbc.co.uk"
    assert extract_domain("apnews.com") == "apnews.com"


def test_calculate_source_reputation_satire():
    satire_source = Source(
        domain="theonion.com",
        name="The Onion",
        historical_accuracy_score=10.0,
        is_known_satire=True,
        is_known_misinfo=False
    )
    rep = calculate_source_reputation_score(satire_source)
    assert rep["score"] == 15.0
    assert rep["label"] == "Satire / Parody"


def test_calculate_source_reputation_verified():
    verified_source = Source(
        domain="reuters.com",
        name="Reuters",
        historical_accuracy_score=96.0,
        is_known_satire=False,
        is_known_misinfo=False
    )
    rep = calculate_source_reputation_score(verified_source)
    assert rep["score"] == 96.0
    assert rep["label"] == "Verified Publisher"
