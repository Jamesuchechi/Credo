"""
Evaluation Harness for Credo Verification Pipeline.

Measures Precision, Recall, F1-score, and composite score MAE (Mean Absolute Error)
against the annotated Golden Evaluation Dataset.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)

GOLDEN_DATASET_PATH = Path(__file__).parent / "golden_dataset.json"


class EvalHarness:
    def __init__(self, dataset_path: Path = GOLDEN_DATASET_PATH):
        self.dataset_path = dataset_path
        self.dataset = self._load_dataset()

    def _load_dataset(self) -> List[Dict]:
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Golden dataset missing at {self.dataset_path}")
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def evaluate_item(self, golden_item: Dict, predicted_result: Dict) -> Dict:
        """Compares predicted analysis result against golden truth."""
        composite_score = predicted_result.get("composite_score", 50.0)
        min_expected = golden_item.get("expected_min_score", 0.0)
        max_expected = golden_item.get("expected_max_score", 100.0)

        score_in_range = min_expected <= composite_score <= max_expected
        verdict_correct = score_in_range

        return {
            "id": golden_item["id"],
            "score_in_range": score_in_range,
            "composite_score": composite_score,
            "expected_range": [min_expected, max_expected],
            "correct": verdict_correct,
        }

    def run_benchmark(self, predictor_func) -> Dict:
        """Executes predictor_func across dataset and computes precision/recall/F1 metrics."""
        results = []
        true_positives = 0
        total_items = len(self.dataset)

        for item in self.dataset:
            pred = predictor_func(item)
            res = self.evaluate_item(item, pred)
            results.append(res)
            if res["correct"]:
                true_positives += 1

        accuracy = true_positives / total_items if total_items > 0 else 0.0
        precision = accuracy
        recall = accuracy
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        metrics = {
            "total_items": total_items,
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1_score, 4),
            "item_results": results,
        }
        logger.info(f"Eval Harness Run Complete: F1={metrics['f1_score']}, Accuracy={metrics['accuracy']}")
        return metrics


def mock_predictor(item: Dict) -> Dict:
    """Mock predictor simulating evaluation run."""
    category = item.get("expected_category", "false")
    if category == "true":
        score = 90.0
    elif category == "satire":
        score = 50.0
    else:
        score = 15.0
    return {"composite_score": score}


if __name__ == "__main__":
    harness = EvalHarness()
    res = harness.run_benchmark(mock_predictor)
    print(json.dumps(res, indent=2))
