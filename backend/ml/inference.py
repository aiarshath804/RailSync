"""
RailSync ML Inference & Explainability Engine.
Loads persisted Random Forest artifact from disk and provides fast, reproducible,
explainable risk predictions with confidence scoring and fallback handling.
"""

import os
import json
from typing import Dict, Any, List, Optional

from backend.ml.feature_engineering import FeaturePipeline
from backend.ml.model import RandomForestModel
from backend.ml.trainer import ModelTrainer, MODEL_ARTIFACT_PATH, MODEL_VERSION

CONFIDENCE_THRESHOLD = 0.45


class MLInferenceEngine:
    _instance: Optional["MLInferenceEngine"] = None

    def __init__(self):
        self.model: Optional[RandomForestModel] = None
        self.pipeline: Optional[FeaturePipeline] = None
        self.model_version: str = MODEL_VERSION
        self.trained_at: str = ""
        self.dataset_info: Dict[str, Any] = {}
        self.load_model()

    @classmethod
    def get_instance(cls) -> "MLInferenceEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self, force_retrain_if_missing: bool = True) -> bool:
        """
        Loads the trained model artifact from disk. If missing, automatically trains one.
        """
        if not os.path.exists(MODEL_ARTIFACT_PATH):
            if force_retrain_if_missing:
                print("[RailSync ML] No existing model artifact found. Training initial model...")
                ModelTrainer.train_and_evaluate()
            else:
                return False

        try:
            with open(MODEL_ARTIFACT_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.model_version = data.get("model_version", MODEL_VERSION)
            self.trained_at = data.get("trained_at", "")
            self.dataset_info = data.get("dataset_info", {})
            self.pipeline = FeaturePipeline.from_dict(data.get("feature_pipeline", {}))
            self.model = RandomForestModel.from_dict(data.get("model_data", {}))
            print(f"[RailSync ML] Successfully loaded model {self.model_version} trained at {self.trained_at}")
            return True
        except Exception as e:
            print(f"[RailSync ML] Error loading model artifact: {e}. Retraining...")
            if force_retrain_if_missing:
                ModelTrainer.train_and_evaluate()
                return self.load_model(force_retrain_if_missing=False)
            return False

    def predict_risk(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Performs authoritative inference and explanation on a maintenance request.
        """
        if self.model is None or self.pipeline is None:
            self.load_model()

        # Handle empty/invalid model fallback
        if self.model is None or self.pipeline is None or not self.model.is_trained:
            # Deterministic fallback
            sev = int(request.get("defect_severity") or 3)
            base_prob = round(sev / 5.0, 2)
            return {
                "failure_risk_probability": base_prob,
                "predicted_risk_level": "HIGH" if sev >= 4 else ("MEDIUM" if sev >= 3 else "LOW"),
                "model_confidence": 0.50,
                "is_low_confidence": True,
                "fallback_used": True,
                "model_version": "Deterministic-Heuristic-Fallback",
                "class_probabilities": {"LOW": 0.1, "MEDIUM": 0.3, "HIGH": 0.4, "CRITICAL": 0.2},
                "top_feature_contributions": [],
                "explanation": f"Deterministic fallback used. Risk mapped directly from severity {sev}."
            }

        # 1. Feature Extraction & Transformation
        raw_features = self.pipeline.extract_features_from_request(request)
        vector = self.pipeline.transform_sample(raw_features)

        # 2. Model Inference & Attribution
        avg_probs, pred_idx, pred_label, confidence, raw_attributions = self.model.explain_sample(vector, top_k=4)

        # 3. Compute continuous composite failure risk probability
        # Weighted expectation across classes [LOW(0.10), MEDIUM(0.35), HIGH(0.70), CRITICAL(0.95)]
        weights = [0.10, 0.35, 0.70, 0.95]
        composite_prob = sum(p * w for p, w in zip(avg_probs, weights))
        composite_prob = round(max(0.01, min(0.99, composite_prob)), 3)

        is_low_conf = confidence < CONFIDENCE_THRESHOLD

        # Format class probabilities map
        class_prob_map = {
            label: avg_probs[i] for i, label in enumerate(RandomForestModel.CLASS_LABELS)
        }

        # Format readable top feature contributions
        top_contributions = []
        for item in raw_attributions:
            fname = item["feature"]
            readable_name = fname.replace("_", " ").title()
            val = raw_features.get(fname, item.get("value"))
            
            desc = f"{readable_name} ({val}) drove {item['direction'].lower().replace('_', ' ')}"
            if "previous_failure" in fname:
                desc = f"{val} repeat asset failure(s) recorded in maintenance history"
            elif "severity" in fname:
                desc = f"Defect severity level rated at {val}/5"
            elif "overdue" in fname:
                desc = f"Maintenance task is overdue by {val} days"
            elif "inspection" in fname:
                desc = f"{val} days elapsed since prior track inspection"
            elif "utilization" in fname:
                desc = f"Corridor operating at heavy {val}% track occupancy"
            elif "weather" in fname:
                desc = f"Environmental weather risk index at {val}"

            top_contributions.append({
                "feature": fname,
                "display_name": readable_name,
                "raw_value": val,
                "attribution_score": item["attribution_score"],
                "global_importance": item["global_importance"],
                "direction": item["direction"],
                "description": desc
            })

        # Compose readable natural language explanation
        top_driver_texts = [tc["description"] for tc in top_contributions[:3]]
        drivers_joined = "; ".join(top_driver_texts) if top_driver_texts else "general asset operational parameters"
        
        explanation = (
            f"ML Model ({self.model_version}) predicted {pred_label} risk with {int(confidence * 100)}% confidence. "
            f"Key factors: {drivers_joined}."
        )

        return {
            "failure_risk_probability": composite_prob,
            "predicted_risk_level": pred_label,
            "predicted_class_index": pred_idx,
            "model_confidence": round(confidence, 3),
            "is_low_confidence": is_low_conf,
            "fallback_used": False,
            "model_version": self.model_version,
            "class_probabilities": class_prob_map,
            "top_feature_contributions": top_contributions,
            "explanation": explanation,
            "raw_features_extracted": raw_features
        }

    def predict_batch(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self.predict_risk(req) for req in requests]
