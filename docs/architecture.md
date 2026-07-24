# Credo Architecture Documentation

## Overview

Credo is a multi-modal credibility infrastructure engine. It ingests URLs, raw text, images, video/audio clips, screenshots, and social posts, extracts atomic claims, corroborates them against independent fact-checking and news sources, computes source reputation, flags manipulation tactics, and computes a versioned composite score with full explainability.

## Pipeline Architecture

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

## Data Schema (PostgreSQL)

### `sources`
- `id` (UUID, PK)
- `domain` (VARCHAR, UNIQUE)
- `name` (VARCHAR)
- `historical_accuracy_score` (FLOAT, 0.0 - 1.0)
- `bias_rating` (VARCHAR) -- left, lean-left, center, lean-right, right, satire, state-sponsored
- `whois_created_at` (TIMESTAMP)
- `is_known_satire` (BOOLEAN)
- `is_known_misinfo` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### `content_items`
- `id` (UUID, PK)
- `modality` (VARCHAR) -- url, text, image, video, audio, screenshot, social_post
- `content_hash` (VARCHAR, INDEX)
- `raw_payload` (TEXT)
- `extracted_text` (TEXT)
- `cleaned_text` (TEXT) -- post PII scrubbing and translation
- `source_id` (UUID, FK -> sources.id, NULLABLE)
- `status` (VARCHAR) -- queued, processing, complete, failed
- `created_at` (TIMESTAMP)

### `claims`
- `id` (UUID, PK)
- `content_item_id` (UUID, FK -> content_items.id)
- `claim_text` (TEXT)
- `verification_status` (VARCHAR) -- supported, contradicted, unverified
- `confidence_score` (FLOAT)
- `supporting_sources` (JSONB)
- `contradicting_sources` (JSONB)
- `created_at` (TIMESTAMP)

### `analysis_results`
- `id` (UUID, PK)
- `content_item_id` (UUID, FK -> content_items.id)
- `composite_score` (FLOAT, 0.0 - 100.0)
- `dimension_scores` (JSONB) -- { factual_accuracy, source_reputation, manipulation_tactics, bias, temporal_consistency }
- `reasoning_chain` (JSONB)
- `model_version` (VARCHAR)
- `created_at` (TIMESTAMP)
