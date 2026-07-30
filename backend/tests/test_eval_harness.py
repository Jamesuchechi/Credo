import pytest
from app.evals.eval_harness import EvalHarness, mock_predictor


def test_eval_harness_benchmark():
    harness = EvalHarness()
    results = harness.run_benchmark(mock_predictor)

    assert results["total_items"] >= 5
    assert results["accuracy"] >= 0.8
    assert results["f1_score"] >= 0.8
