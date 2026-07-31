# Credo — Feature Build: Social Ingestion, Author Attribution & Topic Clustering

Use this as a task list for yourself or as a prompt for a coding agent (Claude Code, etc.) working in the `Credo` repo. It assumes the agent has repo access and can run migrations. Each phase is scoped to be shippable independently — do not skip straight to Phase 3 without 1 and 2, since clustering needs real claim data to be worth anything.

## Context for the agent

Read these files first before making changes, to match existing patterns:
- `backend/app/services/social_post_parser.py` — current stub, being replaced.
- `backend/app/services/claim_extractor.py` — existing LLM claim extraction; `extracted_speaker` field already exists here but means "who the claim is attributed to in the text," NOT "who posted this."
- `backend/app/models/claim.py`, `backend/app/models/content_item.py` — existing models to extend.
- `backend/app/services/source_reputation_service.py` — existing domain-reputation scoring pattern to mirror for author reputation.
- `backend/app/api/content.py` — where submission/analysis endpoints live; **note the known IDOR bug on `GET /content/{id}` and `/content/{id}/stream` (no `user_id` ownership check) — fix that in the same pass if touching this file, don't propagate the pattern to new endpoints.**
- Safe-fetch: there is currently no SSRF-safe HTTP client anywhere in the codebase (`article_extractor.py` and `webhook_service.py` both fetch arbitrary user-influenced URLs unguarded). Any new outbound HTTP call this feature adds (fetching post content, thread parents, author profile data) MUST go through a new shared `app/core/safe_http.py` client — do not add a fourth unguarded `httpx.AsyncClient()` call site. Build `safe_http.py` first if it doesn't exist yet:
  - Resolve hostname, reject RFC1918/loopback/link-local/`169.254.169.254`/`.internal` ranges.
  - Re-check the resolved IP after every redirect hop.
  - Enforce a response size cap and timeout.

---

## Phase 1 — Real social ingestion (replace the stub)

- [ ] Add `X_API_BEARER_TOKEN` and `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` to `app/core/config.py` (`Settings`) and `.env.example` (both backend and root, matching existing key style).
- [ ] Build `backend/app/services/social_ingestion_service.py`:
  - [ ] `fetch_x_post(url: str) -> SocialPostData` using X API v2 (`GET /2/tweets/:id` with `expansions=author_id,referenced_tweets.id` and `tweet.fields`, `user.fields` for author metrics). Use `safe_http.py` for the request.
- [x] `fetch_reddit_post(url: str) -> SocialPostData` using Reddit's public `.json` endpoint trick (`https://www.reddit.com/...json` — no API keys or Client ID required).
  - [x] Return a common `SocialPostData` shape regardless of platform: `platform`, `author_handle`, `author_display_name`, `author_verified: bool`, `author_follower_count: int | None`, `author_account_created_at: datetime | None`, `post_text`, `post_created_at`, `media_urls: list[str]`, `parent_post_url: str | None` (for replies/quote posts), `engagement: dict` (likes/reposts/replies where available).
  - [ ] Explicitly do NOT attempt Facebook/Instagram/TikTok scraping without an official API partnership — Meta and TikTok both gate public-content API access behind app review/business verification, and unauthorized scraping is a ToS and legal risk, not just an engineering task. For these platforms, keep the current URL-only fallback behavior (tag platform, store the link, skip author/engagement enrichment) until/unless official API access is secured.
  - [ ] Graceful degradation: if the platform API call fails (rate limit, deleted post, private account), fall back to the existing regex-stub behavior rather than failing the whole submission.
- [ ] Wire into `backend/app/api/content.py` submission flow: when `modality == "social_post"`, call `social_ingestion_service` instead of `parse_social_post` directly (keep `parse_social_post` only as the platform-detection helper it already is).
- [ ] Tests: mock the X/Reddit API responses (don't hit real APIs in CI); cover the fallback-on-failure path explicitly.

## Phase 2 — Author identity & attribution model

- [ ] New model `backend/app/models/social_author.py`:
  ```python
  class SocialAuthor(Base):
      __tablename__ = "social_authors"
      id: UUID
      platform: str            # "x", "reddit", etc.
      handle: str               # unique per platform
      display_name: str | None
      verified: bool
      follower_count: int | None
      account_created_at: datetime | None
      first_seen_at: datetime
      # unique constraint on (platform, handle)
  ```
- [ ] Add `social_author_id: UUID | None` FK on `ContentItem` (nullable — only populated for social-post submissions).
- [ ] Migration via Alembic (check `backend/alembic/` for existing migration style/naming convention before generating).
- [ ] Keep `Claim.extracted_speaker` as-is (in-text attribution) — do not merge these two concepts into one field. Document the distinction in a code comment on both fields since the naming is easy to confuse later.
- [ ] Build `backend/app/services/author_reputation_service.py`, mirroring `source_reputation_service.py`'s shape:
  - [ ] Score = f(verdict history of this author's past submissions: % supported / contradicted / unverified), account age, verified status.
  - [ ] `GET /authors/{platform}/{handle}` endpoint returning the profile + score + list of past analyzed items from that author (respecting existing per-user content visibility rules — an author profile page should NOT leak the content_item details of other users' private submissions; only show items that are already public/eligible, or aggregate stats only, whichever matches your current data-visibility model).
- [ ] Frontend: author card component on the content result page (handle, verified badge, follower count, mini reputation score, "X previous claims analyzed").

## Phase 3 — Topic clustering & related-claims

- [ ] Add `pgvector` extension to Postgres (migration: `CREATE EXTENSION IF NOT EXISTS vector;`) and add an `embedding` column (`Vector(dim)`, pick dim to match whatever embedding model you choose) to `Claim`.
- [ ] Pick an embedding source — reuse whichever LLM provider key you already pay for (OpenRouter/Groq) if it offers embeddings, otherwise a small local sentence-embedding model to avoid a new API cost line.
- [ ] Build `backend/app/services/claim_clustering_service.py`:
  - [ ] `embed_claim(claim_text: str) -> list[float]` — called at claim-creation time in `claim_extractor.py`'s pipeline, stored on the `Claim` row.
  - [ ] `find_related_claims(claim_id: UUID, limit=5) -> list[Claim]` — cosine-similarity nearest-neighbor query via pgvector, scoped to claims above a similarity threshold (tune empirically) and within a recency window (e.g. last 30 days) so "related" stays meaningful.
- [ ] Add `topic_label: str | None` to `Claim` (or a lightweight `Topic` table if you want shared labels across claims rather than one-off strings) — populate via LLM prompt extension in `claim_extractor.py` (`topic_category` already exists per-claim; decide whether to promote it to a shared `Topic` table with a slug, or leave as free text and rely on embeddings for clustering rather than exact-label matching).
- [ ] New endpoint `GET /content/{content_id}/related` — returns related claims across other content items, each with its own verdict, so the UI can show "3 other sources made a similar/contradicting claim about this."
- [ ] Frontend: "Related claims" panel on the content result page; extend the existing claim-graph visualization (`/dashboard/claim-graph`) to add author and topic-cluster edges as new node/edge types rather than building a separate graph view.
- [ ] Tests: seed a small fixture set of claims with known similar/dissimilar pairs, assert clustering returns expected neighbors above/below threshold.

## Rollout order

Phase 1 → 2 → 3, each independently deployable. Do not build Phase 3 clustering against synthetic/stub data — it needs Phase 1's real post text to produce meaningful embeddings, otherwise you're clustering near-empty placeholder strings.

## Out of scope for this pass (flag, don't build)

- Facebook/Instagram/TikTok official API integration — pursue only if/when a business API agreement is in place.
- Real-time streaming ingestion (webhooks from X's filtered stream API, etc.) — start with on-demand fetch-at-submission-time; revisit streaming only if usage patterns justify the added complexity/cost.