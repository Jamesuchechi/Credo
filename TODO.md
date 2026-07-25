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

- [ ] Screenshot OCR pipeline (Tesseract or cloud OCR API)
- [ ] C2PA / Content Credentials provenance metadata extraction (detect digital camera signatures & edits)
- [ ] Image reverse search integration (Google Vision API or TinEye) — catch recycled/out-of-context images
- [ ] VLM Image-Caption context alignment (detecting mismatched visual context between text and image)
- [ ] Audio/video transcription pipeline (Groq Whisper)
- [ ] Deepfake artifact screening (research + integrate an open model — lip-sync mismatch, frequency artifacts)
- [ ] Automatic PII Redaction (scrub phone numbers, emails, addresses, names from screenshots/text before storage or external API calls)
- [ ] Social media post parsers (start with one platform, expand — check ToS/API access constraints per platform)
- [ ] Generalize `content_items` ingestion API to cleanly route each modality through its pre-processor

## Phase 5 — Explainability & Transparency Layer

- [ ] Full reasoning-chain payload on every analysis result (which claims, which sources, which contradicted)
- [ ] Server-Sent Events (SSE) progress endpoint (`GET /content/{id}/stream`) for real-time step-by-step state updates
- [ ] Public-facing "show your work" UI component
- [ ] Exportable Credibility Cards (OG image / PDF format for social media & messaging app sharing)
- [ ] Model/version stamping visible in UI, with changelog of scoring-model versions
- [ ] Confidence intervals surfaced in UI, not just point scores

## Phase 6 — Community Layer

- [ ] `contributors` table + reputation weighting logic
- [ ] Crowdsourced claim verification UI (submit corrections/evidence on a claim)
- [ ] Contributor reputation scoring algorithm
- [ ] Expert/journalist review queue (manual review of disputed items)
- [ ] Feedback loop: verified community corrections feed back into model training/weight tuning

## Phase 7 — Product Surfaces

- [ ] Browser extension (real-time badge while browsing) — separate `extension/` package
- [ ] WhatsApp bot (forward a message, get a credibility card back) — separate `bot/` service; research WhatsApp Business API access requirements
- [ ] Telegram bot (lower integration friction than WhatsApp — consider building first)
- [ ] Webhook notification system (`POST /webhooks/analysis-complete`) for enterprise clients & bot callbacks
- [ ] Publisher/newsroom dashboard with embeddable trust badge & JS widget
- [ ] Personal "credibility diet" weekly digest feature

## Phase 8 — Platform / Monetization Layer

- [ ] Public API key management + usage-based rate limiting
- [ ] Tiered API Token Quota & credit management
- [ ] SDK/client libraries (start with JS/TS, then Python)
- [ ] Enterprise API documentation + onboarding flow
- [ ] Billing integration (consider Paystack given African market context)
- [ ] Usage analytics dashboard for API customers

## Phase 9 — Reliability, Evals & MLOps

- [ ] Golden Evaluation Dataset: Curate an annotated benchmark set of 200+ multi-modal items (true, false, satire, temporal mismatch, false dichotomy).
- [ ] Automated CI Eval Harness: CI pipeline integration measuring Precision, Recall, and F1-score for claim extraction and scoring updates.
- [ ] LLM Token Cost & Latency Dashboard: Real-time tracking of token counts, cost-per-analysis, and latency breakdown per provider (Groq vs. OpenRouter).
- [ ] Circuit Breakers & Dead-Letter Queue (DLQ) for worker task resilience against third-party API downtime.
- [ ] Privacy & Data Retention Pipeline: Automated purging/anonymization of user-submitted content in compliance with NDPR/GDPR.

## Cross-Cutting / Ongoing

- [ ] Test coverage for every service (unit + integration), not just endpoints
- [ ] Rate limiting + abuse prevention on public-facing submission endpoints
- [ ] Caching strategy review (dedupe identical URL/content submissions via hash before reprocessing)
- [ ] Observability: structured logging, error tracking (e.g., Sentry), basic metrics/dashboards
- [ ] Security review: input sanitization on all ingestion paths, especially image/video uploads
- [ ] Circuit breakers & graceful degradation for third-party APIs (WHOIS, News API, Fact Check API)
- [ ] Cost monitoring for LLM API usage (OpenRouter/Groq) — track per-analysis cost
- [ ] Documentation kept in sync: `docs/architecture.md`, `docs/scoring-methodology.md`, `docs/api-reference.md`

## Open Decisions (need resolving, not just building)

- [ ] Auth strategy: JWT + refresh tokens vs. session-based vs. third-party (Supabase Auth, Clerk, etc.)
- [ ] Deployment target: single VPS vs. containerized (Docker Compose) vs. cloud-managed (Railway/Render/Fly.io/AWS)
- [ ] Which source-reputation dataset(s) are legally usable long-term (verify ToS on any scraped dataset before relying on it in production)
- [ ] WhatsApp Business API access path (official API has approval/cost overhead — evaluate vs. Telegram-first strategy)
- [ ] License choice (MIT/Apache-2.0 for openness vs. proprietary if pursuing the enterprise API path commercially)
- [ ] Data retention policy for submitted user content (privacy implications, especially for personal WhatsApp forwards)