# Credo API Reference (v1)

Base URL: `http://localhost:8000/api/v1`

## Endpoints

### `GET /health`
Health check endpoint verifying API service, PostgreSQL, and Redis connectivity.

**Response (200 OK):**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "connected",
  "redis": "connected"
}
```

---

### `POST /content`
Submit a new Content Item for credibility analysis.

**Request Body:**
```json
{
  "modality": "url | text | image | video | audio | screenshot | social_post",
  "payload": "https://example.com/article or raw text",
  "metadata": {
    "platform": "whatsapp | twitter | web"
  }
}
```

**Response (202 Accepted):**
```json
{
  "content_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "queued",
  "message": "Content queued for multi-modal analysis"
}
```

---

### `GET /content/{content_id}`
Fetch the analysis status and full results breakdown.

**Response (200 OK):**
```json
{
  "content_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "complete",
  "composite_score": 84.5,
  "dimensions": {
    "factual_accuracy": 90.0,
    "source_reputation": 85.0,
    "manipulation_tactics": 10.0,
    "bias": "center",
    "temporal_consistency": 95.0
  },
  "claims": [
    {
      "claim_id": "c101",
      "text": "GDP grew by 3.2% in Q2.",
      "verification_status": "supported",
      "confidence": 0.92,
      "supporting_sources": ["Reuters", "Bloomberg"]
    }
  ],
  "model_version": "v1.0.0"
}
```

---

### `GET /content/{content_id}/stream`
Stream real-time analysis progress updates via Server-Sent Events (SSE).

**Event Format:**
```
event: progress
data: {"step": "claim_extraction", "progress": 40, "message": "Extracted 4 atomic claims"}
```
