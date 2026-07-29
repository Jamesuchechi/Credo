# Credo Backend

FastAPI backend application for the Credo multi-modal credibility infrastructure engine.

---

## Prerequisites

- **Python**: 3.11+ (managed via [`uv`](https://github.com/astral-sh/uv))
- **Database**: PostgreSQL (or local instance / Docker container)
- **Cache & Queue**: Redis server running on `redis://localhost:6379/0`

---

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Sync dependencies:
   ```bash
   uv sync
   ```

---

## Running the Services

### 1. Database Migrations
Apply Alembic migrations to initialize/update PostgreSQL tables:
```bash
cd backend
uv run alembic upgrade head
```

### 2. Start FastAPI Backend Server
Runs the web API on `http://localhost:8000` with live reload enabled:
```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger UI): `http://localhost:8000/docs`
- Redoc UI: `http://localhost:8000/redoc`

### 3. Start ARQ Background Worker
Runs the async task worker processing multi-modal content ingestion, claim verification, and scoring:
```bash
cd backend
uv run arq app.workers.worker.WorkerSettings
```

---

## Running Tests

Run the full pytest suite:
```bash
cd backend
uv run pytest
```
