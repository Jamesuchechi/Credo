# Credo — Feature Build: Six "Outside the Box" Extensions

Companion to `social-feature-todo.md` (social ingestion / author attribution / topic clustering). Several items below depend on that file's Phase 3 (claim embeddings) — build order matters here more than usual, follow it rather than picking randomly.

Dependency order:
```
social-feature-todo.md Phase 1-3 (ingestion, authors, embeddings)
        │
        ├──> Feature A: Claim Mutation Tracking      (needs embeddings)
        ├──> Feature F: Retraction Watchdog           (independent, can build anytime)
        ├──> Feature B: Signed Credibility Receipt    (independent, can build anytime — do this one early, it's the cheapest)
        ├──> Feature D: Advocate/Skeptic Debate Mode  (independent, extends claim_verification pipeline)
        ├──> Feature C: Voice-Note Fact-Checking      (needs WhatsApp bot + Phase 4 transcription infra)
        └──> Feature E: Public Literacy Game          (needs eval harness dataset — build LAST, needs a body of real analyzed items to draw from)
```

Recommended build order: **B → F → A → D → C → E**.

---

## Feature B — Signed Credibility Receipt (build first: cheapest, no new infra)

- [x] New model `backend/app/models/credibility_receipt.py`: `id`, `content_item_id` (FK), `verdict_summary` (jsonb snapshot at issue time — score, corroboration %, verdict label, claim count), `issued_at`, `signature` (see below), `public_slug` (short random ID for the embeddable URL, distinct from internal `content_item.id` so you're not leaking internal IDs into public embeds).
- [x] Add an Ed25519 or HMAC signing keypair to `app/core/config.py` (`RECEIPT_SIGNING_KEY`), kept out of `.env.example` with a placeholder — never commit the real key.
- [x] `backend/app/services/receipt_service.py`:
  - [x] `issue_receipt(content_item_id) -> CredibilityReceipt` — snapshots the verdict at issue time (verdicts can change later if re-analyzed; the receipt is a point-in-time claim, not a live pointer — document this clearly in the API response so embedders understand it's not auto-updating).
  - [x] `verify_receipt(public_slug) -> bool` — recomputes/checks the signature against stored data, so third parties (or you) can detect tampering if someone edits the embed HTML.
- [x] New public (no-auth) endpoint `GET /receipts/{public_slug}` returning: verdict summary, issue date, signature, and a link back to the full reasoning page. Since this is intentionally public, make sure `content_item.user_id`, raw payload text, and any PII-adjacent fields are explicitly excluded from the response — only the verdict snapshot fields above.
- [x] Embed widget: a small oEmbed-style endpoint (`GET /receipts/{public_slug}/embed.js` or a static badge SVG + iframe) that publishers can drop into an article. Keep the badge visual minimal (score + "Checked by Credo" + link) — this is your organic distribution surface, so it should look clean enough that publishers actually want it on their page.
- [x] Rate-limit receipt issuance per content item (one active receipt per item, or versioned receipts on re-analysis) — don't let this become a way to spam-generate public URLs.

## Feature F — Retraction/Correction Watchdog (independent, build second)

- [x] New table `backend/app/models/cited_source.py` (if not already implicit in your corroboration data) tracking: `source_url`, `content_hash_at_citation`, `first_cited_at`, `last_checked_at`, list of `content_item_id`s that cited it.
- [x] Scheduled ARQ job (reuse the worker infra from `app/workers/worker.py`) — `recheck_cited_sources`: periodically re-fetches previously-cited source URLs (through the safe-fetch client from the other TODO — this is another outbound-URL-fetch call site, route it through `safe_http.py`, don't add a new unguarded one) and diffs current content hash against `content_hash_at_citation`.
- [x] On detected retraction/correction (heuristic: page now contains "correction," "retraction," "editor's note," or the article is 404/removed — start heuristic, don't over-engineer NLP detection here on day one): mark affected `content_item`s with a `has_flagged_source_update: bool` and store what changed.
- [x] Notification: reuse whatever notification channel you already have (email/webhook) to tell the original submitter their analysis relied on a source that's since been corrected.
- [x] Frontend: a small banner on any content result page whose cited sources have since changed — "A source used in this analysis has been updated since [date]."
- [x] Keep the recheck frequency modest at first (e.g. weekly per source, not per-item) — this is a background job, not a real-time feature; don't let it become a rate-limit/cost problem against source domains.

## Feature A — Claim Mutation Tracking (needs `social-feature-todo.md` Phase 3 embeddings)

- [x] Extend `Claim` with `parent_claim_id: UUID | None` (self-referential FK) and `mutation_score: float | None` (semantic distance from parent).
- [x] `backend/app/services/claim_clustering_service.py` (from the other TODO) gets a new function: `find_candidate_parent(claim) -> Claim | None` — instead of Phase 3's same-time nearest-neighbor search, this searches for similar-but-earlier claims (ordered by `created_at`, similarity above threshold but below "identical" — you want "close enough to be a variant" not "the same text repeated").
- [x] Build a mutation chain view: given any claim, walk `parent_claim_id` back to the root and forward to all children, producing an ordered list showing the text at each hop and the similarity delta between adjacent hops.
- [x] New endpoint `GET /claims/{claim_id}/mutation-chain`.
- [x] Frontend: a simple "lineage" view — original claim at top, each subsequent variant below it with a highlighted diff (word-level diff, not just a similarity score) and its own verdict, so the "telephone game" drift is visually obvious.
- [x] This is worth flagging in the UI copy carefully: a "root" claim is only the earliest one *you've indexed*, not necessarily the true original — don't claim more certainty about origin than the data supports.

## Feature D — Advocate/Skeptic Debate Mode (independent, extends claim verification)

- [x] In `backend/app/services/claim_verification_service.py` (or wherever the current single-pass verification lives), add a `debate_mode` path:
  - [x] `run_advocate_pass(claim, evidence) -> ArgumentResult` — LLM prompt framed to argue the claim is well-supported, citing the strongest evidence for it.
  - [x] `run_skeptic_pass(claim, evidence) -> ArgumentResult` — LLM prompt framed to argue the claim is unsupported/misleading, citing the strongest evidence against it or gaps in the evidence.
  - [x] `synthesize_verdict(advocate, skeptic) -> Verdict` — a third pass (or deterministic logic) that weighs both and produces the final score + a visible reasoning trace, not just a number.
- [x] Store all three passes (advocate, skeptic, synthesis) rather than discarding the intermediate reasoning — this is the actual product value, so don't collapse it back down to a single opaque score in storage.
- [x] New response field on the content result: `debate_transcript: {advocate: str, skeptic: str, synthesis: str}`.
- [x] Cost note: this roughly triples LLM calls per verification. Gate it behind a flag — e.g. default single-pass verification, "show your work" as an explicit opt-in re-run (ties directly into the per-user LLM-spend cap flagged in the original security audit; make sure that cap accounts for debate-mode being 3x cost before you ship this).
- [x] Tests: assert the synthesis pass doesn't just parrot whichever side went last (order-bias check — run the same claim with advocate-first vs skeptic-first ordering and confirm the verdict doesn't flip based on order alone).

## Feature C — Voice-Note Fact-Checking (needs WhatsApp bot + Phase 4 transcription)

- [x] Confirm current state of `media_transcription.py` — per the original audit, Phase 4 media services were explicitly documented as placeholders. This feature is blocked on transcription actually working, not blocked on new code of its own — prioritize finishing real transcription (Whisper API or similar) before building bot-specific flow on top of a stub.
- [x] WhatsApp bot flow: user forwards a voice note → bot acknowledges receipt immediately (voice notes can be long; don't leave the user hanging) → transcribe → run through existing claim extraction/verification pipeline → reply with a compact text summary (not the full dashboard card — match the "low-bandwidth mode" idea from the earlier product suggestions) plus a link to the full receipt (Feature B ties in nicely here).
- [x] Handle multi-speaker voice notes if feasible (diarization) — many forwarded voice notes are recordings of a conversation, not a single speaker monologuing; if diarization isn't feasible day one, at minimum note in the transcript output "multiple voices detected" so the claim extractor doesn't misattribute quotes.
- [x] Language handling: reuse Phase 3's cross-lingual pipeline — a lot of real-world forwarded voice notes will be in Nigerian Pidgin, Yoruba, Hausa, Igbo, etc., not English. Check what your transcription provider actually supports before committing to this as a launch feature; if coverage is weak for local languages, say so in the UI rather than silently producing garbage transcripts.

## Feature E — Public Literacy Game (build last, needs a real corpus)

- [x] Depends on having a meaningful number of real analyzed items with confident verdicts (don't launch this against a thin/synthetic dataset — it'll feel obviously fake).
- [x] New table `backend/app/models/quiz_item.py`: references a `content_item_id`, stores an anonymized/redacted version of the claim (strip any submitter-identifying info even though it's the claim text, not the submission, that's exposed), the correct verdict, and a difficulty tag.
- [x] Curation step — do NOT auto-publish every analyzed item into the quiz pool. Add an admin review/approval flag before an item becomes a quiz question (ties into the admin/moderation role-based access gap flagged in the original audit — build that RBAC piece if it doesn't exist yet, since this is the first feature that actually needs an "admin" concept).
- [x] Simple game loop: show claim → user guesses true/false/misleading → reveal verdict + brief reasoning → score tally. Keep it stateless/anonymous to start (no account needed to play) — the value is distribution and casual engagement, don't put a signup wall in front of it.
- [x] Feed user answers back as weak labels into the eval harness (Phase 9) — store `(quiz_item_id, user_guess, is_correct)` aggregated, not tied to individual user identity, and treat it as a *signal* for eval-set disagreement hotspots (items where most players guess wrong are worth a second look by you, not automatically "wrong verdicts") rather than a ground-truth override.
- [x] Shareability: a shareable result card ("I scored 8/10 spotting misinformation") is the actual growth mechanism here — worth more design attention than the quiz mechanics themselves.

---

## Cross-cutting reminders (apply across all six)

- Every new outbound HTTP call (Feature F's source re-check, Feature C's transcription API, any future embed fetch) goes through the shared `safe_http.py` client from the social-ingestion TODO — don't add another unguarded `httpx` call site.
- Every new public-facing endpoint (Feature B's receipts, Feature E's quiz) needs an explicit pass on what fields are exposed — default to an allowlist of fields, not "return the model minus a few excluded ones," since it's easy to forget to strip something later when the model gains new fields.
- Debate mode (D) and voice-note handling (C) both meaningfully increase LLM cost per item — make sure the per-user spend cap from the original audit is in place and accounts for these before either ships.