# Contributing to Credo

Thanks for your interest in contributing. This document covers everything needed to go from cloning the repo to landing a merged PR.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Project Philosophy](#project-philosophy)
- [Getting Set Up](#getting-set-up)
- [Branching Strategy](#branching-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Adding a New Modality Pre-processor](#adding-a-new-modality-pre-processor)
- [Adding a New Corroboration/Verification Source](#adding-a-new-corroborationverification-source)
- [Working with the Scoring/Aggregation Service](#working-with-the-scoringaggregation-service)
- [Documentation Expectations](#documentation-expectations)
- [Security Issues](#security-issues)

## Code of Conduct

Be respectful, assume good faith, keep disagreements about the work, not the person. Standard open-source etiquette applies: no harassment, no personal attacks, review the idea not the individual.

## Project Philosophy

Before contributing, understand the core design principle: **Credo scores dimensions independently and explains itself — it never collapses everything into an opaque single number.** Any contribution that pushes toward a black-box binary "real/fake" classification is against the grain of the project and will likely be asked to be reworked. When in doubt, favor:

- Explainability over cleverness
- Versioned, auditable scoring changes over silent tuning
- Modular, modality-agnostic pipeline stages over content-type-specific one-offs

## Getting Set Up

1. Fork and clone the repository
2. Follow the [Getting Started](./README.md#getting-started) section of the README for backend/frontend/worker setup
3. Copy `.env.example` to `.env` in both `backend/` and `frontend/`, and obtain your own development API keys (News API, OpenRouter, Groq, Google Fact Check Tools, WHOIS provider) — never commit real keys
4. Run the test suite to confirm your environment is working before making changes:
   ```bash
   cd backend && pytest
   cd frontend && npm test
   ```

## Branching Strategy

- `main` — always deployable, protected branch
- `develop` — integration branch for the next release (if/when release cadence warrants it; early on, PRs may target `main` directly)
- Feature branches: `feature/<short-description>` (e.g., `feature/claim-extraction-service`)
- Fix branches: `fix/<short-description>`
- Chore/docs branches: `chore/<short-description>`, `docs/<short-description>`

Keep branches focused — one feature or fix per branch. Avoid bundling unrelated changes.

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`

**Examples:**
```
feat(claims): add per-claim corroboration against Google Fact Check API
fix(workers): correct ARQ retry backoff for transcription tasks
docs(readme): update environment variable reference
refactor(scoring): extract dimension weighting into versioned config
```

Scope should reference the relevant service/module (`claims`, `sources`, `scoring`, `ingestion`, `frontend`, `workers`, etc.).

## Pull Request Process

1. Ensure your branch is up to date with the target branch before opening a PR
2. PR description must include:
   - What changed and why
   - Which phase/TODO item this addresses (link to `TODO.md` line if applicable)
   - How it was tested
   - Any new environment variables or API keys required
3. All CI checks (lint, tests) must pass before review
4. At least one approving review required before merge (once the team grows beyond a solo contributor — for now, self-merge is acceptable but should still pass CI and include a clear description for future reference)
5. Squash-merge preferred, to keep `main` history clean
6. Update `TODO.md` to check off completed items as part of the same PR when applicable
7. Update relevant docs (`README.md`, `docs/architecture.md`, `docs/api-reference.md`) in the same PR as the code change — documentation drift is treated as a bug

## Code Style

### Backend (Python/FastAPI)
- Formatter/linter: `ruff` (formatting + linting in one tool)
- Type hints required on all function signatures
- Pydantic models for all request/response schemas — no raw dicts across service boundaries
- Async all the way down for I/O-bound operations (API calls, DB queries) — no blocking calls inside async routes
- Service layer separation: routers should stay thin; business logic lives in `app/services/`, not in route handlers
- One responsibility per service module (e.g., `claim_extraction_service.py` should not also handle corroboration)

### Frontend (React/Vite)
- Formatter/linter: `eslint` + `prettier`
- Functional components + hooks only, no class components
- Co-locate component-specific styles and tests with their component
- API calls go through the centralized `src/api/` client layer — no ad hoc `fetch` calls scattered through components
- Type everything — this is a TypeScript project; avoid `any`

### General
- No secrets, API keys, or credentials committed — ever. Use `.env` files, verify `.gitignore` covers them
- Prefer small, focused functions over large multi-purpose ones
- Comment the *why*, not the *what* — code should be self-explanatory for the "what"

## Testing Requirements

- New services/endpoints require corresponding tests before merge — untested code paths are treated as incomplete work, not follow-up items
- Backend: `pytest`, with `pytest-asyncio` for async service tests. Mock external API calls (News API, OpenRouter, Groq, etc.) in unit tests — never hit real third-party APIs in CI
- Frontend: `vitest` + React Testing Library for component tests
- Integration tests for the full pipeline (ingestion → extraction → corroboration → aggregation) should use recorded/fixture responses for external APIs, not live calls
- Aim for meaningful coverage of business logic (scoring, aggregation, claim verification status logic) over incidental coverage of boilerplate

## Adding a New Modality Pre-processor

Since the architecture is modality-agnostic by design, adding support for a new content type (e.g., a new social platform, a new media format) should follow this pattern:

1. Add the new modality value to the `modality` enum in `app/schemas/content.py`
2. Implement a pre-processor in `app/services/preprocessors/` that converts the raw input into normalized text/claims-ready output
3. Register the pre-processor in the ingestion router's modality dispatch
4. Ensure the pre-processor's output feeds into the existing Claim Extraction Service unchanged — do not create a parallel extraction path per modality
5. Add fixture-based tests covering both success and malformed-input cases

## Adding a New Corroboration/Verification Source

1. Implement the client in `app/services/corroboration/`, following the existing interface (see `news_api_client.py` for reference shape)
2. Never let a single source's downtime block analysis — all corroboration clients must handle timeouts/errors gracefully and degrade to "unverified" rather than failing the whole request
3. Document the new source's rate limits and cost implications in `docs/api-reference.md`
4. Add it to `.env.example` with a clear comment on where to obtain a key

## Working with the Scoring/Aggregation Service

- Any change to dimension weights or scoring logic must bump the `model_version` value — scores must remain auditable across versions
- Do not silently change scoring behavior for existing content; if reprocessing historical items with a new model version, store both old and new results rather than overwriting
- Document the rationale for any weight change in the PR description and in `docs/scoring-methodology.md`

## Documentation Expectations

- `README.md` — kept current for setup/onboarding and high-level architecture
- `docs/architecture.md` — detailed system design, full DDL, service interaction diagrams
- `docs/scoring-methodology.md` — full explanation of every dimension, how it's computed, and version history of weight changes
- `docs/api-reference.md` — complete endpoint reference, kept in sync with actual implemented routes (not aspirational)
- `TODO.md` — phased roadmap, updated as items complete or scope changes

## Security Issues

Do not open a public issue for security vulnerabilities. Instead, reach out directly to the maintainer to report it privately so it can be addressed before public disclosure.