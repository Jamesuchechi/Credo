import logging
from typing import Any

from app.models.claim import Claim
from app.models.source import Source

logger = logging.getLogger(__name__)


def compute_phase3_composite_score(
    source: Source | None,
    claims: list[Claim],
    corroborating_sources: list[dict[str, Any]],
    text_length: int,
    clickbait_data: dict[str, Any],
    virality_data: dict[str, Any],
    manipulation_data: dict[str, Any],
    satire_data: dict[str, Any],
    temporal_data: dict[str, Any]
) -> dict[str, Any]:
    """
    Computes Phase 3 composite credibility score integrating claim-level verifications,
    source publisher reputation, WHOIS domain age, manipulation safety, clickbait risk,
    satire flags, and temporal consistency.
    """
    # 1. Source Reputation Sub-Score (0-100)
    source_score = source.historical_accuracy_score if source else 50.0

    # 2. Claim-Level Factual Accuracy Sub-Score (0-100)
    if claims:
        claim_scores = []
        for c in claims:
            if c.verdict == "supported":
                claim_scores.append(c.confidence_score)
            elif c.verdict == "contradicted":
                claim_scores.append(100.0 - c.confidence_score)
            else:
                claim_scores.append(45.0)
        factual_accuracy = sum(claim_scores) / len(claim_scores)
    else:
        corrob_count = len(corroborating_sources)
        factual_accuracy = min(40.0 + (corrob_count * 12.0), 95.0)

    # 3. Manipulation Safety Sub-Score (0-100, where 100 = 0 manipulation)
    manipulation_safety = max(0.0, 100.0 - manipulation_data.get("manipulation_score", 0.0))

    # 4. Stylometric Safety Sub-Score (0-100, where 100 = minimal clickbait/sensationalism)
    clickbait_risk = clickbait_data.get("clickbait_score", 0.0)
    stylometric_safety = max(0.0, 100.0 - clickbait_risk)

    # 5. Temporal Consistency Sub-Score (0-100)
    temporal_score = temporal_data.get("temporal_score", 95.0)

    # 6. Composite Score Formula (Phase 3)
    composite = (
        (0.40 * factual_accuracy) +
        (0.25 * source_score) +
        (0.15 * manipulation_safety) +
        (0.10 * stylometric_safety) +
        (0.10 * temporal_score)
    )
    composite = round(max(0.0, min(100.0, composite)), 1)

    # Satire Override Flag
    is_satire = satire_data.get("is_satire", False)
    if is_satire:
        summary_note = f"[SATIRE / PARODY] {satire_data.get('reason', 'Recognized satire source.')}"
    else:
        tactics_list = [t["label"] for t in manipulation_data.get("detected_tactics", [])]
        tactics_str = ", ".join(tactics_list) if tactics_list else "None"
        summary_note = (
            f"Credibility Analysis Complete: {len(claims)} claim(s) verified. "
            f"Clickbait Risk: {clickbait_risk}%. Manipulation Tactics: {tactics_str}. "
            f"Independent Bias Axis: {source.bias_rating if source else 'center'}."
        )

    # 7. Confidence Interval (0-100 bounds)
    if claims:
        import statistics
        claim_scores_for_ci = []
        for c in claims:
            if c.verdict == "supported":
                claim_scores_for_ci.append(c.confidence_score)
            elif c.verdict == "contradicted":
                claim_scores_for_ci.append(100.0 - c.confidence_score)
            else:
                claim_scores_for_ci.append(45.0)
        if len(claim_scores_for_ci) > 1:
            std_dev = statistics.stdev(claim_scores_for_ci)
            margin = min(12.0, max(3.0, std_dev / (len(claim_scores_for_ci) ** 0.5)))
        else:
            margin = 8.0
    else:
        margin = 10.0

    confidence_interval = {
        "lower": round(max(0.0, composite - margin), 1),
        "upper": round(min(100.0, composite + margin), 1),
        "margin": round(margin, 1),
    }

    return {
        "composite_score": composite,
        "confidence_interval": confidence_interval,
        "dimension_scores": {
            "factual_accuracy": round(factual_accuracy, 1),
            "source_reputation": round(source_score, 1),
            "manipulation_tactics": round(manipulation_data.get("manipulation_score", 0.0), 1),
            "clickbait_risk": round(clickbait_risk, 1),
            "virality_risk": round(virality_data.get("virality_score", 0.0), 1),
            "temporal_consistency": round(temporal_score, 1),
            "bias": source.bias_rating if source else "center",
            "is_satire": is_satire
        },
        "reasoning_chain": {
            "summary": summary_note,
            "claims_checked_count": len(claims),
            "detected_manipulation_tactics": manipulation_data.get("detected_tactics", []),
            "satire_info": satire_data,
            "temporal_info": temporal_data,
            "clickbait_info": clickbait_data
        }
    }
