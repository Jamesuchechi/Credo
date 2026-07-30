import pytest
import uuid
from app.core.circuit_breaker import CircuitBreaker, CircuitState
from app.services.webhook_service import compute_signature, event_types_match
from app.services.privacy_service import PrivacyService


def test_webhook_signature():
    secret = "test_secret_key"
    payload = b'{"event":"analysis.completed"}'
    sig = compute_signature(secret, payload)
    assert len(sig) == 64
    assert sig == compute_signature(secret, payload)


def test_webhook_event_matching():
    assert event_types_match(["*"], "analysis.completed") is True
    assert event_types_match(["analysis.completed"], "analysis.completed") is True
    assert event_types_match(["claim.status_changed"], "analysis.completed") is False


def test_circuit_breaker():
    cb = CircuitBreaker("test_service", failure_threshold=2, recovery_timeout=1.0)
    assert cb.can_execute() is True
    assert cb.state == CircuitState.CLOSED

    cb.record_failure()
    assert cb.state == CircuitState.CLOSED
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    cb.record_success()
    assert cb.state == CircuitState.CLOSED


def test_privacy_service_instantiation():
    ps = PrivacyService(retention_days=14)
    assert ps.retention_days == 14
