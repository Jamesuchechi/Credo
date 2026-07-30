# TODO / Roadmap

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

This roadmap is phased so each phase ships something independently usable/demoable, rather than requiring the entire pipeline before anything works.

---

## Phase 0 — Foundations

- [x] Repo scaffolding: `backend/`, `frontend/`, `docs/` structure
- [x] Backend: managed by uv and uvx
- [x] Backend: FastAPI app skeleton, config/settings module (pydantic-settings)
- [x] Backend: PostgreSQL connection + Alembic migrations setup
- [x] Backend: Redis connection setup
- [x] Backend: ARQ worker skeleton + health-check task
- [x] Frontend: Vite + React scaffold, base routing, API client setup
- [x] CI: lint + test pipeline (backend: ruff/pytest, frontend: eslint/vitest)
- [x] `.env.example` files for both backend and frontend
- [x] Decide and document license (Apache 2.0 license created)
- [x] Decide auth strategy (OAuth2 Bearer JWT selected)

## Phase 1 — Source Reputation + Corroboration MVP (no LLM required)

This phase alone is a usable, demoable product.

- [x] `sources` table + migration
- [x] Seed source reputation DB from public datasets (MBFC-style data — verify ToS before scraping/using any dataset)
- [x] WHOIS lookup integration (domain age signal)
- [x] Article extraction service (readability/trafilatura) for URL submissions
- [x] News API integration
- [x] Secondary corroboration source integration (GNews or NewsData.io) — never rely on a single aggregator
- [x] Google Fact Check Tools API integration
- [x] Fallback routing across corroboration APIs (e.g. fallback to secondary provider when rate-limited)
- [x] Semantic caching in Redis (URL/content hash deduplication to bypass redundant scraping/corroboration)
- [x] Basic composite scoring (source reputation + corroboration count, no claim-level granularity yet)
- [x] `POST /content` + `GET /content/{id}` endpoints (URL/text modality only)
- [x] Frontend: submission form + basic results view
- [x] `GET /content` endpoint — paginated user-scoped list (Recent analyses row)
- [x] `GET /sources` endpoint — paginated top sources by reputation (Sources to watch)
- [x] `GET /dashboard/summary` endpoint — real aggregate queries scoped to user (stat-row numbers)
- [x] Frontend: dashboard wired to live API endpoints (summary, content list, sources list)
- [x] Frontend: sidebar converted to React Router `<NavLink>` with is-active driven by actual route
- [x] Frontend: inline submit-error state replaces `alert(err.message)` on failure
- [x] SSE endpoint `GET /content/{id}/stream` — live step-by-step analysis progress in AnalysisModal

## Phase 2 — Claim-Level Verification (the "advanced" layer)

- [x] `claims` table + migration
- [x] LLM claim extraction service (OpenRouter — start with one strong general-purpose model)
- [x] Pydantic / JSON Schema structured output guards on LLM claim extraction (hallucination prevention)
- [x] Per-claim corroboration (route each extracted claim through Phase 1's corroboration services independently)
- [x] Semantic claim deduplication & similarity clustering (group identical claims phrased differently)
- [x] Claim verification status logic (supported / contradicted / unverified) with confidence scoring
- [x] Time-to-Live (TTL) & decay tracking on claim verification status to handle breaking news updates
- [x] Aggregation service v1: combine per-claim results into composite + dimension scores
- [x] `analysis_results` table with `model_version` field for auditability
- [x] Frontend: per-claim breakdown cards, not just a single score
- [x] Groq integration for latency-sensitive claim scoring calls

## Phase 3 — Linguistic & Manipulation Analysis

- [x] Stylometric/linguistic scorer (in-house lightweight model — sentiment, subjectivity, clickbait classifier; no LLM call needed, keep this cheap and fast)
- [x] Manipulation tactics detector (false dichotomy, appeal to fear, cherry-picking, out-of-context quoting)
- [x] Satire detection (suppress false positives from known parody/satire sources)
- [x] Bias vs. falsehood separation — score as two independent axes, not one
- [x] Temporal mismatch detection (flag real-but-miscontextualized content — cross-reference claim dates against corroborating source dates)
- [x] Cross-lingual NLP pipeline (automatic translation of local dialects/languages to English before corroboration)
- [x] Adversarial prompt injection defense shield on raw text prior to LLM extraction
- [x] Virality/spread-risk scorer (emotional language + structural features)
- [x] Update aggregation service to weight in these new dimensions (versioned weights)

## Phase 4 — Multi-Modal Ingestion

- [x] Screenshot OCR pipeline (`backend/app/services/ocr_service.py`) — Tesseract local + Google Vision fallback
- [x] Image pre-processor (`backend/app/services/media_preprocessor.py`) — data URI / base64 / URL decoding
- [x] C2PA / Content Credentials provenance metadata extraction (`backend/app/services/c2pa_provenance.py`) — placeholder preserving ingestion flow
- [x] Image reverse search integration (`backend/app/services/image_reverse_search.py`) — Google Vision WEB_DETECTION when API key configured
- [x] VLM Image-Caption context alignment (`backend/app/services/vlm_alignment.py`) — placeholder preserving ingestion flow
- [x] Audio/video transcription pipeline (`backend/app/services/media_transcription.py`) — placeholder preserving ingestion flow (Groq Whisper plug-in point)
- [x] Deepfake artifact screening (`backend/app/services/deepfake_screener.py`) — placeholder preserving ingestion flow
- [x] Automatic PII Redaction (`backend/app/services/pii_redactor.py`) — regex-based redaction before external API calls and storage
- [x] Social media post parsers (`backend/app/services/social_post_parser.py`) — Twitter/X, Reddit, Facebook, Instagram, TikTok URL detection
- [x] Generalize `content_items` ingestion API to cleanly route each modality through its pre-processor (`backend/app/workers/worker.py::_preprocess_modality`)
- [x] Tests: `backend/tests/test_phase4_multimodal.py` (18 passing, 2 skipped for optional Pillow)

## Phase 5 — Explainability & Transparency Layer

- [x] Full reasoning-chain payload on every analysis result (which claims, which sources, which contradicted)
- [x] Server-Sent Events (SSE) progress endpoint (`GET /content/{id}/stream`) for real-time step-by-step state updates
- [x] Public-facing "show your work" UI component
- [x] Exportable Credibility Cards (OG image / PDF format for social media & messaging app sharing)
- [x] Model/version stamping visible in UI, with changelog of scoring-model versions
- [x] Confidence intervals surfaced in UI, not just point scores

## Phase 6 — Community Layer

- [x] `contributors` table + reputation weighting logic (`backend/app/models/contributor.py`, `backend/app/models/claim_correction.py`)
- [x] Crowdsourced claim verification UI (submit corrections/evidence on a claim in `AnalysisModal.tsx`)
- [x] Contributor reputation scoring algorithm (`backend/app/services/community_service.py::calculate_contributor_weight`)
- [x] Expert/journalist review queue (manual review of disputed items at `/dashboard/review-queue` & `ReviewQueuePage.tsx`)
- [x] Feedback loop: verified community corrections feed back into model training/weight tuning (`backend/app/services/community_service.py::recalculate_claim_verdict_and_composite_score`)

## Phase 7 — Product Surfaces

- [x] Browser extension (real-time badge while browsing) — separate `extension/` package
- [x] WhatsApp bot (forward a message, get a credibility card back) — separate `bot/` service; research WhatsApp Business API access requirements
- [x] Telegram bot (lower integration friction than WhatsApp — consider building first)
- [x] Webhook notification system (`POST /webhooks/analysis-complete`) for enterprise clients & bot callbacks
- [x] Authenticated dashboard shell (`/dashboard`) with sidebar navigation
- [x] Dashboard overview page — stat row + recent analyses + sources to watch (all live data)
- [x] History page (`/dashboard/history`) — paginated list of all user analyses
- [x] Sources page (`/dashboard/sources`) — paginated source reputation table
- [x] Settings page (`/dashboard/settings`) — profile display + session management
- [x] Claim graph page (`/dashboard/claim-graph`) — interactive SVG node propagation network visualization
- [x] API key management page (`/dashboard/api-keys`) — generate/revoke/monitor token quotas
- [x] Publisher/newsroom dashboard with embeddable trust badge & JS widget (`/dashboard/publisher-widgets`)
- [x] Personal "credibility diet" weekly digest feature

## Phase 8 — Platform / Monetization Layer

- [x] Public API key management + usage-based rate limiting
- [ ] Tiered API Token Quota & credit management
- [ ] SDK/client libraries (start with JS/TS, then Python)
- [ ] Enterprise API documentation + onboarding flow
- [ ] Billing integration (consider Paystack given African market context)
- [x] Usage analytics dashboard for API customers (`/dashboard/analytics`)

## Phase 9 — Reliability, Evals & MLOps

- [x] Golden Evaluation Dataset: Curate an annotated benchmark set of 200+ multi-modal items (true, false, satire, temporal mismatch, false dichotomy).
- [x] Automated CI Eval Harness: CI pipeline integration measuring Precision, Recall, and F1-score for claim extraction and scoring updates.
- [x] LLM Token Cost & Latency Dashboard: Real-time tracking of token counts, cost-per-analysis, and latency breakdown per provider (Groq vs. OpenRouter).
- [x] Circuit Breakers & Dead-Letter Queue (DLQ) for worker task resilience against third-party API downtime.
- [x] Privacy & Data Retention Pipeline: Automated purging/anonymization of user-submitted content in compliance with NDPR/GDPR.

## Phase 10 — Growth & Retention Features (adoption-focused, not yet scoped elsewhere)

These target the actual friction/retention gaps in how misinformation spreads and how people
would realistically use Credo day-to-day — distinct from raw pipeline capability or platform
plumbing already covered above.

- [x] PWA + Web Share Target API support: let users share a link/screenshot/forwarded message
      directly from their OS share sheet (WhatsApp, Twitter, etc.) into Credo, instead of
      copy-pasting into the site. Ships well before WhatsApp Business API approval and removes
      the main friction point standing between "saw something suspicious" and "checked it."
- [x] Claim status change notifications: opt-in notification when a previously-checked claim's
      verification status changes (leverages existing TTL/decay tracking from Phase 2). Turns
      one-shot lookups into a reason to come back to the product.
- [x] Batch/thread submission: accept a full forwarded chain or thread (not just a single
      URL/text block) and return a per-message breakdown in one submission — matches how
      misinformation actually circulates (chains, not single clean links).
- [x] Public source track-record pages: surface accumulated source reputation over time
      ("this outlet has published N checked items; X% held up") rather than only showing a
      score per individual analysis. Compounding public data, more shareable than a one-off score.
- [x] Surface the cross-lingual pipeline in the UI: show original-language claim → translation →
      verification chain explicitly for non-English submissions (Phase 3 backend work exists but
      isn't visible to users today). Differentiator for African-language content that most
      Western fact-checkers silently fail on.

Suggested near-term order: Web Share Target + claim status notifications first (cheapest, reuse
existing backend work, directly address retention); then batch/thread submission and surfacing
the cross-lingual pipeline; source track-record pages once there's enough analysis volume for
the aggregate stats to be meaningful.

- [x] Ambient in-page highlighting for the browser extension: underline/flag suspicious claims
      directly in the page as the user scrolls (Grammarly-style), using existing claim
      extraction, instead of a click-to-check badge. Passive detection drives daily habitual use
      in a way a badge that has to be remembered and clicked does not. Supersedes/extends the
      "real-time badge" line already under Phase 7's browser extension item.
- [x] Public "Trending misinformation" feed (`/dashboard/trending`): page listing currently-circulating
      claims already checked, ranked using the existing virality/spread-risk scorer. Turns
      already-computed analysis data into an organic-growth surface (search landing page,
      shareable link) instead of keeping every result locked behind a submission.

## Cross-Cutting / Ongoing

- [x] Test coverage for every service (unit + integration), not just endpoints
- [x] Rate limiting + abuse prevention on public-facing submission endpoints
- [x] Caching strategy review (dedupe identical URL/content submissions via hash before reprocessing)
- [x] Observability: structured logging, error tracking (e.g., Sentry), basic metrics/dashboards
- [x] Security review: input sanitization on all ingestion paths, especially image/video uploads
- [x] Circuit breakers & graceful degradation for third-party APIs (WHOIS, News API, Fact Check API)
- [x] Cost monitoring for LLM API usage (OpenRouter/Groq) — track per-analysis cost
- [x] Documentation kept in sync: `docs/architecture.md`, `docs/scoring-methodology.md`, `docs/api-reference.md`


