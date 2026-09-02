"""
RailSync ML Service Interface.
Coordinates model lifecycle, metric retrieval, single/batch inference,
reproducible re-training, and diagnostic health checks.
"""

from typing import Dict, Any, List, Optional
from backend.ml.trainer import ModelTrainer, MODEL_VERSION
from backend.ml.inference import MLInferenceEngine
from backend.ml.dataset import DatasetService


class MLDecisionService:
    MODEL_VERSION = MODEL_VERSION

    @staticmethod
    def get_model_status() -> Dict[str, Any]:
        """
        Returns runtime status, training timestamp, accuracy, and feature metadata.
        """
        engine = MLInferenceEngine.get_instance()
        metrics = ModelTrainer.get_persisted_metrics()
        eval_metrics = metrics.get("evaluation_metrics", {})
        
        return {
            "status": "OPERATIONAL",
            "model_type": "RandomForestClassifier",
            "model_version": engine.model_version,
            "trained_at": engine.trained_at,
            "is_trained": engine.model is not None and engine.model.is_trained,
            "summary_metrics": {
                "accuracy": eval_metrics.get("accuracy", 0.0),
                "macro_f1": eval_metrics.get("macro_f1", 0.0),
                "weighted_f1": eval_metrics.get("weighted_f1", 0.0),
                "brier_score": eval_metrics.get("brier_score", 0.0),
                "test_samples": eval_metrics.get("total_test_samples", 0)
            },
            "top_features": sorted(metrics.get("feature_importances", {}).items(), key=lambda x: x[1], reverse=True)[:6],
            "dataset_info": engine.dataset_info,
            "disclaimer": "RailSync prototype decision-support model. Deterministic safety rules remain authoritative."
        }

    @staticmethod
    def get_evaluation_metrics() -> Dict[str, Any]:
        """
        Returns exhaustive holdout test metrics, confusion matrix, and per-class reports.
        """
        metrics = ModelTrainer.get_persisted_metrics()
        if not metrics:
            ModelTrainer.train_and_evaluate()
            metrics = ModelTrainer.get_persisted_metrics()
        return metrics

    @staticmethod
    def predict_request_risk(request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predicts failure risk probability, risk tier, confidence, and explainability factors.
        """
        engine = MLInferenceEngine.get_instance()
        return engine.predict_risk(request)

    @staticmethod
    def predict_batch_risk(requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        engine = MLInferenceEngine.get_instance()
        return engine.predict_batch(requests)

    @staticmethod
    def retrain_model(n_estimators: int = 35, max_depth: int = 6) -> Dict[str, Any]:
        """
        Retrains the model from historical/synthetic datasets and reloads the inference engine.
        """
        result = ModelTrainer.train_and_evaluate(n_estimators=n_estimators, max_depth=max_depth)
        engine = MLInferenceEngine.get_instance()
        engine.load_model(force_retrain_if_missing=False)
        return result
