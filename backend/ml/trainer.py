"""
RailSync Model Training Pipeline.
Executes reproducible training, holdout validation, evaluation, and artifact serialization.
Model version: RailSync-RF-v1.2.0.
"""

import os
import json
import random
import datetime
from typing import Dict, Any, Tuple

from backend.ml.dataset import DatasetService
from backend.ml.feature_engineering import FeaturePipeline
from backend.ml.model import RandomForestModel
from backend.ml.evaluator import ModelEvaluator

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_ARTIFACT_PATH = os.path.join(MODELS_DIR, "railsync_rf_model.json")
METRICS_ARTIFACT_PATH = os.path.join(MODELS_DIR, "railsync_rf_metrics.json")

MODEL_VERSION = "RailSync-RF-v1.2.0"


class ModelTrainer:
    @staticmethod
    def train_and_evaluate(
        test_ratio: float = 0.20,
        random_state: int = 42,
        n_estimators: int = 35,
        max_depth: int = 6
    ) -> Dict[str, Any]:
        """
        Runs full training lifecycle and saves model artifacts.
        """
        # 1. Load Dataset
        dataset = DatasetService.load_dataset()
        if not dataset:
            raise ValueError("Dataset is empty.")

        # 2. Stratified / Seeded Train-Test Split
        rng = random.Random(random_state)
        shuffled = list(dataset)
        rng.shuffle(shuffled)

        n_test = int(len(shuffled) * test_ratio)
        test_data = shuffled[:n_test]
        train_data = shuffled[n_test:]

        # 3. Fit Preprocessing Pipeline ONLY on Train Data (Zero Leakage)
        pipeline = FeaturePipeline()
        pipeline.fit(train_data)

        X_train = pipeline.transform(train_data)
        X_test = pipeline.transform(test_data)

        # Label encoding for target
        class_to_idx = {label: idx for idx, label in enumerate(RandomForestModel.CLASS_LABELS)}
        y_train = [class_to_idx.get(row.get("failure_risk_class", "MEDIUM"), 1) for row in train_data]
        y_test = [class_to_idx.get(row.get("failure_risk_class", "MEDIUM"), 1) for row in test_data]

        # 4. Train Random Forest Model
        model = RandomForestModel(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=4,
            random_state=random_state
        )
        model.fit(X_train, y_train, feature_names=pipeline.feature_names_out)

        # 5. Evaluate on Holdout Test Split
        y_pred = model.predict(X_test)
        y_probs = model.predict_proba(X_test)

        eval_report = ModelEvaluator.evaluate(
            y_true=y_test,
            y_pred=y_pred,
            y_probs=y_probs,
            class_labels=RandomForestModel.CLASS_LABELS
        )

        # 6. Prepare Artifacts
        os.makedirs(MODELS_DIR, exist_ok=True)
        now_iso = datetime.datetime.now().isoformat()

        model_artifact = {
            "model_type": "RandomForestClassifier",
            "model_version": MODEL_VERSION,
            "trained_at": now_iso,
            "random_state": random_state,
            "dataset_info": {
                "total_samples": len(dataset),
                "train_samples": len(train_data),
                "test_samples": len(test_data),
                "dataset_type": "RailSync synthetic prototype training data",
                "disclaimer": "Trained for prototype decision-support; deterministic safety rules remain authoritative."
            },
            "feature_pipeline": pipeline.to_dict(),
            "model_data": model.to_dict()
        }

        with open(MODEL_ARTIFACT_PATH, "w", encoding="utf-8") as f:
            json.dump(model_artifact, f, indent=2)

        metrics_artifact = {
            "model_version": MODEL_VERSION,
            "evaluated_at": now_iso,
            "evaluation_metrics": eval_report,
            "feature_importances": model.feature_importances,
            "dataset_summary": DatasetService.get_dataset_summary()
        }

        with open(METRICS_ARTIFACT_PATH, "w", encoding="utf-8") as f:
            json.dump(metrics_artifact, f, indent=2)

        return {
            "status": "SUCCESS",
            "model_version": MODEL_VERSION,
            "trained_at": now_iso,
            "train_samples": len(train_data),
            "test_samples": len(test_data),
            "accuracy": eval_report["accuracy"],
            "macro_f1": eval_report["macro_f1"],
            "weighted_f1": eval_report["weighted_f1"],
            "brier_score": eval_report["brier_score"],
            "top_features": sorted(model.feature_importances.items(), key=lambda x: x[1], reverse=True)[:5],
            "metrics_report": eval_report,
            "artifact_saved_path": MODEL_ARTIFACT_PATH
        }

    @staticmethod
    def is_model_trained() -> bool:
        return os.path.exists(MODEL_ARTIFACT_PATH) and os.path.exists(METRICS_ARTIFACT_PATH)

    @staticmethod
    def get_persisted_metrics() -> Dict[str, Any]:
        if os.path.exists(METRICS_ARTIFACT_PATH):
            with open(METRICS_ARTIFACT_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}
