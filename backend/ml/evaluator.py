"""
RailSync Model Evaluator.
Computes multi-class classification metrics: Accuracy, Precision, Recall, F1 (macro & weighted),
Confusion Matrix, per-class breakdowns, Brier score calibration, and support counts on holdout splits.
"""

from typing import List, Dict, Any, Tuple


class ModelEvaluator:
    @staticmethod
    def evaluate(
        y_true: List[int],
        y_pred: List[int],
        y_probs: List[List[float]],
        class_labels: List[str]
    ) -> Dict[str, Any]:
        """
        Computes exhaustive evaluation report on test/validation set.
        """
        if not y_true or not y_pred:
            raise ValueError("Evaluation sets cannot be empty.")

        n_samples = len(y_true)
        num_classes = len(class_labels)

        # 1. Overall Accuracy
        correct = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)
        accuracy = round(correct / n_samples, 4)

        # 2. Confusion Matrix (row: true, col: pred)
        confusion_matrix = [[0] * num_classes for _ in range(num_classes)]
        for yt, yp in zip(y_true, y_pred):
            if 0 <= yt < num_classes and 0 <= yp < num_classes:
                confusion_matrix[yt][yp] += 1

        # 3. Per-class metrics
        per_class_metrics: Dict[str, Dict[str, Any]] = {}
        precisions: List[float] = []
        recalls: List[float] = []
        f1s: List[float] = []
        supports: List[int] = []

        for c in range(num_classes):
            tp = confusion_matrix[c][c]
            fp = sum(confusion_matrix[r][c] for r in range(num_classes) if r != c)
            fn = sum(confusion_matrix[c][col] for col in range(num_classes) if col != c)
            support = sum(confusion_matrix[c])

            precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
            recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
            f1 = round(2 * precision * recall / (precision + recall), 4) if (precision + recall) > 0 else 0.0

            precisions.append(precision)
            recalls.append(recall)
            f1s.append(f1)
            supports.append(support)

            per_class_metrics[class_labels[c]] = {
                "class_index": c,
                "class_label": class_labels[c],
                "precision": precision,
                "recall": recall,
                "f1_score": f1,
                "support": support
            }

        # 4. Macro and Weighted Averages
        macro_precision = round(sum(precisions) / num_classes, 4)
        macro_recall = round(sum(recalls) / num_classes, 4)
        macro_f1 = round(sum(f1s) / num_classes, 4)

        total_support = max(1, sum(supports))
        weighted_precision = round(sum(p * s for p, s in zip(precisions, supports)) / total_support, 4)
        weighted_recall = round(sum(r * s for r, s in zip(recalls, supports)) / total_support, 4)
        weighted_f1 = round(sum(f * s for f, s in zip(f1s, supports)) / total_support, 4)

        # 5. Multi-class Brier Score (lower is better, 0.0 is perfect calibration)
        brier_sum = 0.0
        for yt, probs in zip(y_true, y_probs):
            for c in range(num_classes):
                target = 1.0 if yt == c else 0.0
                prob = probs[c] if c < len(probs) else 0.0
                brier_sum += (prob - target) ** 2
        brier_score = round(brier_sum / (n_samples * num_classes), 4)

        return {
            "total_test_samples": n_samples,
            "accuracy": accuracy,
            "macro_precision": macro_precision,
            "macro_recall": macro_recall,
            "macro_f1": macro_f1,
            "weighted_precision": weighted_precision,
            "weighted_recall": weighted_recall,
            "weighted_f1": weighted_f1,
            "brier_score": brier_score,
            "class_labels": class_labels,
            "confusion_matrix": confusion_matrix,
            "per_class_metrics": per_class_metrics
        }
