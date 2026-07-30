# Credo — Pre-Deployment Audit Report

Repo: github.com/Jamesuchechi/Credo (main, cloned fresh for this audit)
Scope: backend (FastAPI), config/deployment, and cross-check against TODO.md's claimed completion status.

## TL;DR

The breadth of what's built (Phases 0–9 largely present in code) is genuinely impressive. But there are **4 blocking security issues** and **1 blocking compliance bug** that will bite you within days of a public deploy — mostly around trusting user input to reach the network layer, and around features marked `[x]` in TODO.md that are actually inert. None of these are hard to fix; all should be fixed before this touches the public internet.

---

## 1. Critical — fix before deploy

### 1.1 SSRF via URL submission (core feature, not an edge case)
`backend/app/services/article_extractor.py::extract_article_content`
```python
async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
    response = await client.get(url, headers=headers)
```
Any authenticated user can submit `modality: "url"` with `payload: "http://169.254.169.254/latest/meta-data/..."` or `http://localhost:6379`, `http://<internal-service>/admin`, etc. The server fetches it and returns extracted text back through `/content/{id}`. This is a full SSRF with response reflection — on AWS/GCP/Azure this is a path to instance-metadata credential theft. `follow_redirects=True` also means an attacker can host a public URL that 302s to an internal address, defeating naive allowlists.

**Fix:** wrap all outbound fetches (this one and the webhook one below) in a single vetted HTTP client that:
- Resolves the hostname first and rejects private/link-local/loopback ranges (RFC1918, 127.0.0.0/8, 169.254.0.0/16, ::1, fc00::/7) and `localhost`.
- Re-validates the resolved IP after every redirect hop (don't just check the input URL).
- Restricts scheme to `http`/`https` only.
- Enforces a response size cap (`Content-Length` check + streaming cutoff), not just a timeout.

### 1.2 SSRF via webhook delivery
`backend/app/services/webhook_service.py::dispatch_webhook_event` — same issue: `client.post(ep.url, ...)` on a fully user-supplied string, no `HttpUrl` validation (imported but unused in `WebhookCreate`), no private-range check. Same fix as above; route both through the same safe-fetch helper. Also worth: signing requests is already done well (HMAC signature ✅), but you're exposing the last webhook response body (`response_body[:2000]`) back to the user via `/webhooks/{id}/deliveries` — that's useful for debugging but is also an oracle that lets an attacker read up to 2000 bytes of whatever internal endpoint they pointed the webhook at. Fix SSRF first and this stops mattering as much.

### 1.3 Broken object-level authorization (IDOR) on content retrieval
`backend/app/api/content.py`:
- `GET /content/{content_id}` — no `ContentItem.user_id == current_user.id` filter, and worse, `current_user` isn't even a required dependency here (unlike `/content/{content_id}/card`, `/content`, and every other endpoint in the file, which all correctly scope by `user_id`).
- `GET /content/{content_id}/stream` — takes `current_user` as a dependency but never checks ownership either.

Any user (or, on the first endpoint, possibly no auth at all depending on how the frontend calls it) can enumerate UUIDs and read other users' submitted content, extracted claims, and reasoning chains. This is the classic OWASP API #1 (Broken Object Level Authorization), and it's inconsistent with the rest of the same file, which suggests it was an oversight rather than intentional public-read design.

**Fix:** add `ContentItem.user_id == current_user.id` to both queries (or explicitly decide these should be public-by-design and document/rate-limit accordingly — but that's a product decision, not a default).

### 1.4 No real rate limiting anywhere (despite TODO claiming it's done)
`backend/app/main.py`:
```python
async def add_security_headers_and_rate_limit(request, call_next):
    response = await call_next(request)
    ...
    response.headers["X-RateLimit-Limit"] = "100"
    return response
```
This sets a header claiming a limit of 100 — it does not count, track, or reject anything. There is no request counting anywhere in the codebase (confirmed via grep across `app/`). Meanwhile:
- `/auth/login` and `/auth/register` have no throttling → open to credential-stuffing / brute force.
- `/content` triggers LLM calls (OpenRouter/Groq) and third-party API calls (WHOIS, News API, Google Vision) → open to cost-exhaustion / DoS by a single user hammering the endpoint.
- `TODO.md` Phase 8 lists **"Public API key management + usage-based rate limiting" as `[x]` done** — it isn't. The `ApiKey` model/endpoints (create/list/revoke) exist, but grep confirms `ApiKey` is never read anywhere outside `api_keys.py` itself. No dependency validates an `X-API-Key` header, no request is ever attributed to a key, no quota is ever enforced. It's a UI/DB feature with no backend teeth — users can generate keys that do nothing.

**Fix:** add Redis-backed rate limiting (e.g. `slowapi`, or a small custom dependency using the `redis` client you already have) on `/auth/*` (strict, per-IP) and `/content*` (per-user, tiered by plan). If you want to ship the API-key story, add a dependency that resolves `X-API-Key` → `ApiKey` row, checks `is_active`, increments a Redis counter for quota, and updates `last_used_at`. Otherwise, remove the "done" claim from TODO.md and the misleading header until it's real — a fake rate-limit header is worse than none, because it tells API consumers something false.

### 1.5 GDPR/NDPR data-retention pipeline is broken and never runs
`backend/app/services/privacy_service.py`:
```python
if item.raw_text:
    item.raw_text = "[ANONYMIZED_AND_PURGED_PER_DATA_RETENTION_POLICY]"
```
The `ContentItem` model has no `raw_text` field — the actual column is `raw_payload` (`app/models/content_item.py`). This means `PrivacyService.sanitize_and_anonymize_expired_items` would `AttributeError` the moment it ran. It's also never called or scheduled anywhere (no cron entry, no ARQ periodic job, no reference outside its own file) — confirmed by grep. TODO.md Phase 9 marks "Privacy & Data Retention Pipeline" as `[x]` done. In reality: user-submitted content (which can include full article text, screenshots' OCR'd text, social posts — before your PII redactor even runs on some paths) is retained forever, with no purge mechanism at all. Given you're explicitly targeting NDPR/GDPR compliance and an African/Nigerian user base, this is a real legal-exposure gap, not just a code smell.

**Fix:** correct the field name, register it as a periodic ARQ job (you already have the worker infra — `app/workers/worker.py`), and add a test that actually asserts purge happens after the retention window.

---

## 2. High priority — fix soon, before real user data flows through

- **JWT tokens can't be revoked.** 7-day expiry (`ACCESS_TOKEN_EXPIRE_MINUTES = 60*24*7`), no denylist, no refresh-token rotation, no logout endpoint that invalidates anything. If a token leaks, it's live for up to a week with nothing you can do. Minimum fix: short-lived access token (15–30 min) + refresh token stored server-side (Redis) that can be revoked; add `POST /auth/logout`.
- **Token accepted via query string.** `app/api/auth.py::get_current_user` falls back to `request.query_params.get("token")`. Tokens in URLs get logged (access logs, proxies, browser history, `Referer` headers to third parties) and are a well-known anti-pattern. Only accept it in this SSE stream context if there's truly no other option, and if so, treat those specific tokens as extra-short-lived, single-purpose (scope them to just that content_id).
- **No password policy / brute-force protection on register/login.** No minimum complexity check visible in `UserCreate`, no lockout after N failed attempts, no generic timing-safe delay. Combine with 1.4 (no rate limit) and this is a straightforward account-takeover surface.
- **No payload size limits.** `ContentSubmissionRequest.payload: str` has no `max_length`. A user can submit a multi-MB string as "content," which gets hashed, stored in Postgres (`Text` column, unbounded), and shipped to an LLM for claim extraction — a cost and storage bomb. Add a `Field(max_length=...)` (e.g. 50–100KB) and a matching FastAPI body-size limit at the ASGI/reverse-proxy layer.
- **`BatchSubmissionRequest.items` has no cap.** `/content/batch` loops `submit_content` per item with no limit on list length — same cost/DoS exposure, multiplied.
- **API docs are open in production.** `docs_url="/docs"`, `redoc_url="/redoc"` are always on regardless of `settings.ENVIRONMENT`. Fine for dev, but you generally don't want your full schema (including any internal-only routes) walkable by anyone once this is public. Gate behind `if settings.ENVIRONMENT != "production"`.
- **Insecure defaults with no production guardrail.** `SECRET_KEY` defaults to a well-known placeholder string (`"dev-secret-key-change-in-production-min-32-chars"`) with nothing that fails startup if it's still set that way in a prod environment. Same for `docker-compose.yml`'s hardcoded `POSTGRES_PASSWORD: credopassword`. Add a startup check: `if settings.ENVIRONMENT == "production" and settings.SECRET_KEY.startswith("dev-"): raise RuntimeError(...)`.
- **Security headers are incomplete.** You set `X-Content-Type-Options` and `X-Frame-Options`, which is a good start, but there's no `Strict-Transport-Security`, no `Content-Security-Policy`, no `Referrer-Policy`. Worth adding, especially HSTS once you're on TLS.
- **No real audit log.** You asked for one specifically — right now there isn't one. `logger.info`/`logger.warning` calls exist scattered through the code (e.g. dedup hits, webhook failures) but there's no structured, queryable trail of "who did what, when" for security-relevant actions: login success/failure, API key creation/revocation, webhook creation, content deletion, admin/review-queue actions. See suggestion 3.1 below for a concrete shape.

## 3. Medium priority — solidify before or shortly after launch

- **TODO.md overstates completion.** Multiple Phase 4 services (`c2pa_provenance.py`, `vlm_alignment.py`, `media_transcription.py`, `deepfake_screener.py`) are explicitly documented in TODO.md itself as "placeholder preserving ingestion flow" — i.e., not actually doing the analysis they're named for — yet the phase is checked `[x]` and the frontend/model-version changelog presents these as shipped capabilities (`v3.0.0-phase3` changelog reads like a finished feature list). Before launch, decide: either surface these honestly in the UI ("provenance check: not yet available" rather than a score), or scope launch to Phases 1–3 and market Phase 4 multimodal as beta.
- **Test coverage is thin exactly where it matters most.** `test_auth.py` and `test_content_api.py` each have a single test function; there's no test covering the IDOR issue in 1.3, no test asserting rate limiting, no test for the SSRF-prone URL fetch, no test that privacy purge actually purges. Test count is healthiest in `test_phase4_multimodal.py` (20) — but that's the phase full of placeholders. Prioritize auth, authorization, and content-submission edge cases over more multimodal placeholder tests.
- **SSE generator uses a request-scoped DB session after the dependency has likely returned control.** `stream_analysis_progress`'s `event_generator()` closure keeps using `db` (injected via `Depends(get_db)`) inside a long-running `StreamingResponse` generator that polls for up to 120s. Depending on how `get_db` manages session lifecycle/teardown, this can throw on already-closed sessions or hold a DB connection open for the full 2 minutes per active stream — worth load-testing specifically, or switch to opening a fresh session per poll iteration.
- **`docker-compose.yml` only defines Postgres + Redis** — no backend, worker, or frontend service. Fine as a local dev convenience file, but you'll need a real deployment manifest (Dockerfiles + compose/K8s for `backend`, `worker`, `frontend`) plus a decision on secrets management (don't ship `.env` — use your platform's secret store) before this goes to a real environment.
- **Ports `5432` and `6379` are published to the host** in the dev compose file. If this file (or something copied from it) is ever run on a public-facing VM without a firewall, Postgres and Redis are directly reachable from the internet. Not a code bug, but worth a one-line note in your deploy docs: never publish these ports outside a private network in production.

---

## 4. Suggestions, enhancements, and new features

### 4.1 A real audit log (since this was the ask)
Add an `audit_logs` table (append-only, no update/delete path from the app layer) capturing: `actor_user_id | action | resource_type | resource_id | ip_address | user_agent | metadata (jsonb) | created_at`. Emit events for: login success/failure, register, password change, API key create/revoke, webhook create/delete, content delete, community claim-correction submissions, review-queue decisions, and privacy-purge runs. Expose a `/dashboard/audit-log` page (you already have the dashboard shell and a similar pattern in `analytics.py`) scoped to the user's own actions, and a separate admin-only view for platform-wide events. This also gives you the evidence trail NDPR/GDPR data-subject-request handling will eventually need.

### 4.2 Make the API-key feature real
Since the surface area (create/list/revoke UI, dashboard page) is already built, finishing the backend is high-leverage: an `X-API-Key` auth dependency, per-key scopes actually enforced (you already store `scopes: list[str]` but nothing reads it), Redis-based usage counters keyed by key ID, and a `last_used_at` update on each authenticated call. This turns Phase 8 from decorative into a real monetizable surface.

### 4.3 Safe-fetch utility, used everywhere you touch a user-supplied URL
One shared `safe_http_client.py` with DNS-resolution + private-range checks + redirect re-validation + size caps, used by `article_extractor.py`, `webhook_service.py`, and any future modality that fetches by URL (image/video URLs, social post URLs). Fixes 1.1 and 1.2 in one place instead of two, and future-proofs new ingestion paths.

### 4.4 Abuse/cost dashboard for LLM spend
You've already built an eval harness and a token-cost dashboard per TODO Phase 9 — extend it with per-user cost attribution and a configurable per-user daily LLM-spend cap that soft-fails new submissions (with a clear "you've hit your daily analysis limit" message) once exceeded. This is your actual defense against the group of issues in 1.4/2 turning into a surprise API bill.

### 4.5 Confidence-interval / scoring transparency polish
`_compute_confidence_interval` is a nice touch already (Phase 5). Consider surfacing *why* a margin is wide (e.g. "only 1 claim extracted" vs "claims disagree strongly") directly in the UI copy — you have the underlying stdev calculation already, just isn't exposed as a reason string.

### 4.6 Nigerian/African-market specific features (given your stated context)
- Paystack billing integration (already on your Phase 8 backlog) — pair it with the per-user cost cap in 4.4 so free-tier limits are enforceable before you turn on billing.
- Low-bandwidth mode for the WhatsApp/Telegram bots: return a compact text-only credibility summary by default, with the full card as an opt-in follow-up, given data-cost sensitivity in your target market.
- Local-language source reputation seeding — your cross-lingual pipeline (Phase 3) translates content to English for corroboration, but the source-reputation dataset (MBFC-style) is presumably English/US-source-heavy. Worth evaluating coverage gaps for Nigerian/African news domains specifically, since that's likely where a chunk of real submitted content will point.

### 4.7 Admin/moderation surface
You have a review queue (Phase 6) for disputed items, but I didn't see role-based access control anywhere (`User` model — worth checking if there's an `is_admin`/`role` field). If not, add one; right now anything gated only by `get_current_user` is gated by "logged in," not "authorized for this."

---

## Suggested fix order

1. SSRF (1.1, 1.2) — highest severity, core feature path.
2. IDOR on `/content/{id}` and `/content/{id}/stream` (1.3) — one-line fixes.
3. Real rate limiting, at least on `/auth/*` (1.4) — brute force is the easiest attack here.
4. Fix and actually schedule the privacy purge job (1.5) — compliance exposure compounds the longer it's live.
5. Everything in §2, roughly in the order listed.
6. §4 as roadmap items post-launch, prioritizing 4.1 (audit log) and 4.2 (finish API keys) since you've already built half of each.