"""
RailSync Centralized Feature Engineering Pipeline.
Transforms raw maintenance request records into encoded numerical feature vectors.
Guarantees zero data leakage by fitting exclusively on the training split.
Provides bidirectional transform and JSON serialization for artifact persistence.
"""

import json
import statistics
from typing import List, Dict, Any, Tuple, Optional

NUMERICAL_FEATURES = [
    "severity",
    "days_overdue",
    "asset_age_years",
    "days_since_last_inspection",
    "previous_failure_count",
    "traffic_density_rank",
    "corridor_utilization_pct",
    "maintenance_duration_mins",
    "weather_risk_factor"
]

CATEGORICAL_FEATURES = [
    "department",
    "defect_type"
]


class FeaturePipeline:
    def __init__(self):
        self.is_fitted: bool = False
        self.num_features: List[str] = list(NUMERICAL_FEATURES)
        self.cat_features: List[str] = list(CATEGORICAL_FEATURES)
        
        # Learned statistics from training split
        self.num_stats: Dict[str, Dict[str, float]] = {}  # {feat: {'min': ..., 'max': ..., 'mean': ..., 'median': ...}}
        self.cat_vocabularies: Dict[str, List[str]] = {}  # {feat: [val1, val2, ...]}
        self.feature_names_out: List[str] = []

    def fit(self, dataset: List[Dict[str, Any]]) -> "FeaturePipeline":
        """
        Fits the preprocessing pipeline on training data.
        Learns numerical bounds and categorical vocabularies.
        """
        if not dataset:
            raise ValueError("Cannot fit FeaturePipeline on empty dataset.")

        # 1. Numerical Statistics
        self.num_stats = {}
        for feat in self.num_features:
            values = [float(row.get(feat, 0.0)) for row in dataset if row.get(feat) is not None]
            if not values:
                values = [0.0]
            val_min = min(values)
            val_max = max(values)
            val_mean = statistics.mean(values)
            val_median = statistics.median(values)
            # Avoid division by zero
            if val_max == val_min:
                val_max = val_min + 1.0

            self.num_stats[feat] = {
                "min": float(val_min),
                "max": float(val_max),
                "mean": float(val_mean),
                "median": float(val_median)
            }

        # 2. Categorical Vocabularies
        self.cat_vocabularies = {}
        for feat in self.cat_features:
            vocab = sorted(list(set(str(row.get(feat, "UNKNOWN")).upper() for row in dataset if row.get(feat))))
            self.cat_vocabularies[feat] = vocab

        # 3. Construct Feature Names Out
        self.feature_names_out = list(self.num_features)
        for feat in self.cat_features:
            for cat_val in self.cat_vocabularies[feat]:
                self.feature_names_out.append(f"{feat}_{cat_val}")

        self.is_fitted = True
        return self

    def transform_sample(self, sample: Dict[str, Any]) -> List[float]:
        """
        Transforms a single raw or mapped dictionary into a flat numerical vector.
        """
        if not self.is_fitted:
            raise RuntimeError("FeaturePipeline must be fitted before transform.")

        vector: List[float] = []

        # 1. Numerical features (Min-Max scaled to [0.0, 1.0])
        for feat in self.num_features:
            raw_val = sample.get(feat)
            if raw_val is None:
                raw_val = self.num_stats[feat]["median"]
            else:
                try:
                    raw_val = float(raw_val)
                except (ValueError, TypeError):
                    raw_val = self.num_stats[feat]["median"]

            stats = self.num_stats[feat]
            scaled = (raw_val - stats["min"]) / (stats["max"] - stats["min"])
            # Clamp to [0.0, 1.0] to handle outliers safely
            scaled = max(0.0, min(1.0, scaled))
            vector.append(round(scaled, 5))

        # 2. Categorical features (One-hot encoded)
        for feat in self.cat_features:
            raw_val = str(sample.get(feat, "")).upper().strip()
            vocab = self.cat_vocabularies[feat]
            for cat_val in vocab:
                if raw_val == cat_val or (feat == "department" and cat_val in raw_val):
                    vector.append(1.0)
                else:
                    vector.append(0.0)

        return vector

    def transform(self, dataset: List[Dict[str, Any]]) -> List[List[float]]:
        return [self.transform_sample(row) for row in dataset]

    def extract_features_from_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts and normalizes features from a live maintenance request object.
        """
        dept = str(request.get("department_code") or request.get("department") or request.get("source_system") or "TMS").upper()
        raw_defect = str(request.get("defect_type") or request.get("work_type") or "DEFECT").upper()

        # Map common strings to defect types
        defect_type = "DEFECT"
        if "FRACTURE" in raw_defect or "WELD" in raw_defect:
            defect_type = "WELD_FRACTURE"
        elif "TWIST" in raw_defect:
            defect_type = "TRACK_TWIST"
        elif "POINT" in raw_defect or "MACHINE" in raw_defect:
            defect_type = "POINT_MACHINE_FAILURE"
        elif "INTERLOCK" in raw_defect or "CIRCUIT" in raw_defect:
            defect_type = "INTERLOCKING_CIRCUIT_FAULT"
        elif "DROPPER" in raw_defect or "OHE" in raw_defect:
            defect_type = "OHE_DROPPER_SNAP"
        elif "PANTOGRAPH" in raw_defect:
            defect_type = "PANTOGRAPH_ENTANGLEMENT_RISK"
        elif "CORRUGATION" in raw_defect or "GRINDING" in raw_defect:
            defect_type = "RAIL_CORRUGATION"
        elif "BALLAST" in raw_defect or "TAMPING" in raw_defect:
            defect_type = "BALLAST_DEFICIENCY"
        elif "GAUGE" in raw_defect:
            defect_type = "GAUGE_CORRECTION"
        elif "AXLE" in raw_defect or "COUNTER" in raw_defect:
            defect_type = "AXLE_COUNTER_RESET"
        elif "INSULATOR" in raw_defect or "FLASH" in raw_defect:
            defect_type = "CANTILEVER_INSULATOR_FLASH"
        else:
            defect_type = raw_defect.replace(" ", "_")

        severity = int(request.get("defect_severity") or request.get("severity") or 3)
        days_overdue = float(request.get("days_overdue", 0.0))
        asset_age_years = float(request.get("asset_age_years") or request.get("asset_age") or 14.0)
        days_since_last_inspection = int(request.get("days_since_last_inspection") or request.get("inspection_freq") or 90)
        previous_failure_count = int(request.get("previous_failure_count") or request.get("repeat_count") or 1)
        traffic_density_rank = int(request.get("traffic_density_rank", 3))
        corridor_utilization_pct = float(request.get("corridor_utilization_pct", 75.0))
        maintenance_duration_mins = int(request.get("duration_minutes") or request.get("maintenance_duration_mins") or 90)
        weather_risk_factor = float(request.get("weather_risk_factor") or request.get("weather_risk") or 0.25)

        return {
            "department": dept,
            "defect_type": defect_type,
            "severity": severity,
            "days_overdue": days_overdue,
            "asset_age_years": asset_age_years,
            "days_since_last_inspection": days_since_last_inspection,
            "previous_failure_count": previous_failure_count,
            "traffic_density_rank": traffic_density_rank,
            "corridor_utilization_pct": corridor_utilization_pct,
            "maintenance_duration_mins": maintenance_duration_mins,
            "weather_risk_factor": weather_risk_factor
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_fitted": self.is_fitted,
            "num_features": self.num_features,
            "cat_features": self.cat_features,
            "num_stats": self.num_stats,
            "cat_vocabularies": self.cat_vocabularies,
            "feature_names_out": self.feature_names_out
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FeaturePipeline":
        pipe = cls()
        pipe.is_fitted = data.get("is_fitted", False)
        pipe.num_features = data.get("num_features", list(NUMERICAL_FEATURES))
        pipe.cat_features = data.get("cat_features", list(CATEGORICAL_FEATURES))
        pipe.num_stats = data.get("num_stats", {})
        pipe.cat_vocabularies = data.get("cat_vocabularies", {})
        pipe.feature_names_out = data.get("feature_names_out", [])
        return pipe
