# Credo

**A multi-modal credibility infrastructure engine — not a "fake news" checker.**

Credo ingests content — articles, social posts, images, video/audio, screenshots, voice notes — extracts its atomic factual claims, cross-references those claims against independent sources, scores source reputation, detects manipulation tactics, and returns a transparent, explainable credibility breakdown. It is built to be the underlying engine for consumer apps, browser extensions, messaging bots, and B2B/enterprise APIs alike.

---

## Table of Contents

- [Why Credo](#why-credo)
- [Core Concepts](#core-concepts)
- [Features](#features)
- [Architecture](#architecture)
- [Security & Trust Guardrails](#security--trust-guardrails)
- [Model Evaluation & Benchmarking](#model-evaluation--benchmarking)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Services](#running-the-services)
- [API Overview](#api-overview)
- [Data Model](#data-model)
- [Scoring Methodology](#scoring-methodology)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why Credo

Most "fake news detector" tools collapse everything into a single true/false or 0–100 score. This is both technically weak (ground truth is contested, context-dependent, and time-sensitive) and practically uninformative — it tells a user *what* to think, not *why*.

Credo is designed around a different premise: **credibility is multi-dimensional, explainable, and content-type-agnostic.** A piece of content can be:

- Biased but factually accurate
- Neutral in tone but built on fabricated claims
- Real footage, but from the wrong date or event (temporal mismatch)
- Satire, not misinformation
- Partially true, with one manipulated statistic doing the damage

Collapsing these into one number destroys the signal that actually helps people. Credo scores each dimension independently and shows the reasoning chain behind every score.

## Core Concepts

- **Content Item** — the generic unit of analysis. Every submission (article URL, pasted text, image, video, audio clip, screenshot, social post) becomes a Content Item with a `modality` field. All modalities funnel into the same downstream pipeline via modality-specific pre-processors.
- **Claim Graph** — the set of atomic, independently verifiable factual claims extracted from a Content Item, along with the sources that support or contradict each one.
- **Source Reputation** — a continuously updated reputation score per domain/publisher, based on historical accuracy, transparency, bias rating, and known-status flags (satire, known misinformation, state-affiliated media, etc.).
- **Composite Score** — a weighted aggregate across independent dimensions (factual accuracy, source reputation, manipulation tactics, bias, temporal consistency), always shown with its full breakdown — never as an opaque single number.

## Features

### Ingestion & Pre-processing
- URL ingestion with clean article extraction (boilerplate/ad stripping)
- Raw text / pasted content submission with automatic PII scrubbing
- Image ingestion with reverse image search & C2PA / Content Credentials provenance verification
- Video/audio ingestion with Groq Whisper transcription and deepfake artifact screening
- Screenshot OCR (for WhatsApp/social forwards shared as images)
- Social media post ingestion (platform-specific parsers)
- Cross-lingual NLP pipeline (automatic translation of local languages/dialects before claim corroboration)

### Analysis Pipeline
- LLM-driven atomic claim extraction with strict Pydantic JSON schema constraints (hallucination prevention)
- Per-claim corroboration across multiple independent news/fact-check APIs with semantic deduplication caching
- Source reputation lookup and scoring (domain age, track record, known-list membership)
- Manipulation tactics detector (false dichotomy, appeal to fear, cherry-picking, out-of-context quoting)
- Temporal mismatch & decay detection (real content wrong time/context; TTL-based ground truth updates)
- Image-Caption context alignment (VLM check for visual context mismatch)
- Satire detection (to suppress false positives from parody sources)
- Bias vs. falsehood separation, scored as independent axes
- Virality/spread-risk scoring for moderation triage use cases

### Transparency & Trust
- Full reasoning chain published with every score: which claims, which sources, which contradicted
- Model/version-stamped results so scoring changes over time are auditable
- Confidence intervals, not just point scores
- Exportable credibility cards (OG image / PDF digest) for social sharing

### Community Layer
- Crowdsourced claim verification with contributor reputation weighting
- Expert/journalist review queue for disputed items, feeding back into the model
- Personal "credibility diet" digest for users (weekly summary of what they consumed/shared)

### Product Surfaces & Developer Infrastructure
- Web app (submit URL/text/image/audio, get a breakdown)
- Browser extension (real-time badge while browsing/scrolling)
- WhatsApp/Telegram bot (forward a message, get a credibility card back)
- Publisher/newsroom dashboard with embeddable trust badge & JS widgets
- Real-time Server-Sent Events (SSE) progress streaming (`GET /content/{id}/stream`)
- Webhook notification system (`POST /webhooks/analysis-complete`) for async enterprise API customers
- Public API / SDK with tiered rate-limiting & usage analytics

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          React + Vite Frontend                           │
│   Web app · Browser extension · Publisher dashboard · Embeddable Widget  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ REST / SSE / WebSocket / Webhooks
┌────────────────────────────────────▼─────────────────────────────────────┐
│                             FastAPI Backend                              │
│  /content            - submit a Content Item (any modality)             │
│  /content/{id}/stream - SSE real-time state progress updates             │
│  /claims/{id}        - inspect individual claim verification            │
│  /sources/{domain}   - source reputation lookup                         │
│  Ingestion Shield    - Prompt Injection Defense & PII Redactor          │
│  Auth · Rate Limiting · Request Validation · Circuit Breakers            │
└───────┬─────────────────────────────────────────────────┬────────────────┘
        │                                                 │
┌───────▼─────────┐                              ┌────────▼─────────────────┐
│  ARQ Task Queue │                              │  Redis Cache & Store     │
│  async workers  │                              │  - dedupe & semantic hash│
│                 │                              │  - source score TTL      │
└───────┬─────────┘                              └──────────────────────────┘
        │
        ├─→ Pre-processors & Ingestion Shield
        │     ├─ Prompt Injection Filter & PII Redactor
        │     ├─ Article extraction (readability/trafilatura)
        │     ├─ Screenshot OCR + C2PA metadata extraction
        │     ├─ Transcription (audio/video via Groq Whisper)
        │     ├─ Cross-lingual translation (local dialects -> English)
        │     └─ Reverse image search & VLM context alignment
        │
        ├─→ Claim Extraction Service (LLM via OpenRouter/Groq with JSON mode)
        ├─→ Corroboration Service (News API, GNews/NewsData, Google Fact Check API)
        ├─→ Source Reputation Service (internal DB + WHOIS lookups)
        ├─→ Stylometric/Linguistic Scorer (lightweight in-house model)
        ├─→ Manipulation Tactics Detector
        └─→ Aggregation Service → composite score + full explainability payload
                             │
                    ┌────────▼─────────┐
                    │   PostgreSQL     │
                    │  content_items   │
                    │  claims          │
                    │  sources         │
                    │  analysis_results│
                    │  contributors    │
                    └──────────────────┘
```

### Why FastAPI over Django

This is an I/O-bound, async-heavy orchestration workload — a single analysis can trigger 5–15 downstream API calls (per-claim verification, corroboration lookups, transcription). FastAPI's native async fits this far better than Django's request cycle without needing to bolt on Channels/Celery ceremony. ARQ is used as the task queue for async background jobs.

### Why Groq + OpenRouter together

- **Groq** — used where latency matters: real-time claim scoring for the browser extension, and fast transcription (Whisper) for audio/video ingestion.
- **OpenRouter** — used for the heavier reasoning tasks (claim extraction, nuanced manipulation-tactic detection) where model choice/quality flexibility matters more than raw speed, and where we want to swap models without re-architecting the pipeline.

## Security & Trust Guardrails

- **Prompt Injection Defense**: Ingested content (web articles, OCR text, social posts) undergoes strict prompt isolation and sanitization before being injected into LLM prompts to prevent instruction override attacks.
- **PII Redaction**: User-submitted content (especially WhatsApp forwards and screenshots) is automatically scrubbed of phone numbers, emails, home addresses, and names before hitting external APIs or persistent tables.
- **Deterministic Schema Enforcement**: Structural outputs from LLMs are constrained using strict Pydantic JSON schemas to prevent model hallucinations and malformed responses.
- **Circuit Breakers & Graceful Degradation**: External API calls (WHOIS, News API, Fact Check API) are wrapped in circuit breakers to ensure third-party downtime degrades gracefully to "unverified" without crashing worker tasks.

## Model Evaluation & Benchmarking

Credo includes a dedicated evaluation harness (`backend/tests/evals/`) backed by a curated golden benchmark dataset of multi-modal content:
- **Claim Extraction Recall & Precision**: Measures completeness and accuracy of extracted atomic claims against ground-truth benchmarks.
- **Satire Suppression Rate**: Verifies that parody sources (e.g., The Onion, Babylon Bee) are correctly flagged without raising false-positive falsehood alerts.
- **Bias vs. Fact Separation**: Benchmarks the scoring engine's capability to isolate ideological tone from factual accuracy.
- **Automated Regression CI**: Every prompt tweak, model swap, or dimension weight change is executed against the eval suite prior to deployment.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Backend API | FastAPI (Python) |
| Async Streaming | SSE (Server-Sent Events) & WebSockets |
| Task Queue | ARQ |
| Cache & Deduplication | Redis (Hash & TTL Caching) |
| Primary DB | PostgreSQL |
| LLM Inference | OpenRouter, Groq |
| Corroboration APIs | News API, GNews/NewsData.io, Google Fact Check Tools API |
| Source Intelligence | WHOIS API, internal reputation DB |
| Reverse Image & Vision | Google Vision API / TinEye, C2PA Provenance Library |
| Transcription | Groq Whisper |
| Translation & NLP | MarianMT / DeepL API |
| Security & Guardrails | PII Redactor, Prompt Injection Shield, Pydantic Schema Guards |
| Auth | (TBD — see TODO) |
| Deployment | (TBD — see TODO) |

## Project Structure

```
credo/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers
│   │   ├── core/           # config, settings, security
│   │   ├── services/       # extraction, corroboration, scoring, aggregation
│   │   ├── workers/         # ARQ task definitions
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── db/               # migrations (Alembic), session mgmt
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/              # API client
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
├── extension/                # browser extension (later phase)
├── bot/                       # WhatsApp/Telegram bot service (later phase)
├── docs/
│   ├── architecture.md
│   ├── scoring-methodology.md
│   └── api-reference.md
├── TODO.md
├── CONTRIBUTING.md
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- API keys: News API, OpenRouter, Groq, Google Fact Check Tools, WHOIS provider, (optional) GNews/NewsData, Google Vision/TinEye

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys and DB URL
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Worker Setup

```bash
cd backend
arq app.workers.WorkerSettings
```

## Environment Variables

### Backend (`backend/.env`)

```
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/credo

# Redis
REDIS_URL=redis://localhost:6379/0

# LLM Providers
OPENROUTER_API_KEY=
GROQ_API_KEY=

# Corroboration / Fact-Check APIs
NEWS_API_KEY=
GNEWS_API_KEY=
GOOGLE_FACT_CHECK_API_KEY=

# Source Intelligence
WHOIS_API_KEY=

# Media Analysis
GOOGLE_VISION_API_KEY=

# App Config
SECRET_KEY=
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

## Running the Services

| Service | Command | Port |
|---|---|---|
| Backend API | `uvicorn app.main:app --reload` | 8000 |
| Frontend | `npm run dev` | 5173 |
| Worker | `arq app.workers.WorkerSettings` | n/a |
| PostgreSQL | (system service) | 5432 |
| Redis | (system service) | 6379 |

## API Overview

### `POST /content`
Submit a Content Item for analysis.

```json
{
  "modality": "url" | "text" | "image" | "video" | "audio" | "social_post",
  "payload": "https://example.com/article or raw text or base64 media",
  "metadata": { "source_platform": "optional" }
}
```

Returns `{ "content_id": "uuid", "status": "queued" }`.

### `GET /content/{content_id}`
Poll or (via WebSocket) stream analysis progress and the final result:

```json
{
  "content_id": "uuid",
  "status": "processing" | "complete" | "failed",
  "composite_score": 0.0,
  "dimensions": {
    "factual_accuracy": 0.0,
    "source_reputation": 0.0,
    "manipulation_tactics": 0.0,
    "bias": 0.0,
    "temporal_consistency": 0.0
  },
  "claims": [
    {
      "claim_id": "uuid",
      "text": "...",
      "verification_status": "supported" | "contradicted" | "unverified",
      "supporting_sources": ["..."],
      "contradicting_sources": ["..."]
    }
  ],
  "model_version": "v1.0.0"
}
```

### `GET /sources/{domain}`
Retrieve reputation data for a given domain.

Full endpoint reference lives in `docs/api-reference.md` (kept in sync as endpoints are added — see TODO).

## Data Model

Core tables (see `docs/architecture.md` for full DDL):

- **`sources`** — domain, historical_accuracy_score, bias_rating, first_seen, whois_age, is_known_satire, is_known_misinfo
- **`content_items`** — id, modality, url_hash/content_hash, extracted_text, published_at, source_id
- **`claims`** — id, content_item_id, claim_text, claim_type, verification_status, supporting_sources[], contradicting_sources[]
- **`analysis_results`** — id, content_item_id, composite_score, dimension_scores (jsonb), confidence, model_version
- **`contributors`** — id, reputation_score, verified_claims_count (community verification layer)

## Scoring Methodology

Full methodology documented in `docs/scoring-methodology.md`. Summary: each dimension is scored independently on its own scale, then combined into a composite score using explicit, versioned weights — never a black-box aggregate. Every score change across model versions is auditable via the `model_version` field on `analysis_results`.

## Roadmap

See [`TODO.md`](./TODO.md) for the full phased build plan.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, branching, commit conventions, and PR process.

## License

TBD.