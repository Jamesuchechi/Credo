# Credo Scoring Methodology

## Core Philosophy

Credo never collapses credibility into an unexplainable binary score (e.g. "Fake" vs "Real"). Instead, Credo evaluates content across 5 independent dimensions and presents a version-stamped, fully auditable breakdown.

## Dimension Definitions

| Dimension | Scale | Description | Primary Data Inputs |
|---|---|---|---|
| **Factual Accuracy** | 0.0 - 100.0 | Proportion of verifiable atomic claims supported vs contradicted by independent news and fact-check sources. | Google Fact Check Tools API, News API, GNews/NewsData |
| **Source Reputation** | 0.0 - 100.0 | Track record, domain age, transparency, and known editorial standard flags of the publishing domain. | WHOIS API, MBFC dataset, internal source DB |
| **Manipulation Tactics** | 0.0 - 100.0 | Inverse rating of logical fallacies, emotional manipulation (appeal to fear, false dichotomy), and out-of-context quotes. | Stylometric NLP classifier, LLM tactic detector |
| **Bias Rating** | Scale (-1.0 to +1.0) | Ideological slant score, explicitly separated from factual accuracy (a biased article can still be factually accurate). | Media Bias / Fact Check metadata, linguistic analysis |
| **Temporal Consistency** | 0.0 - 100.0 | Verification that media/claims correspond to the actual time and event reported (detects recycled footage or outdated claims). | Image reverse search, claim timestamp cross-matching |

## Composite Score Calculation (v1.0.0)

The composite score $S_{\text{composite}}$ is calculated as:

$$S_{\text{composite}} = w_{f} \cdot S_{\text{factual}} + w_{s} \cdot S_{\text{source}} + w_{m} \cdot (100 - S_{\text{manipulation}}) + w_{t} \cdot S_{\text{temporal}}$$

Where default weights are:
- $w_{f} = 0.45$ (Factual Accuracy)
- $w_{s} = 0.25$ (Source Reputation)
- $w_{m} = 0.15$ (Manipulation Tactics Penalty)
- $w_{t} = 0.15$ (Temporal Consistency)

Every analysis stores `model_version` alongside weights in `analysis_results`.
