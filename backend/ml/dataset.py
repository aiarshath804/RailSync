"""
RailSync ML Dataset Service: Unified Maintenance Failure Risk Training Data.
Combines real project schema attributes with realistic synthetic historical maintenance logs.

DISCLAIMER:
"The machine-learning component in RailSync is a prototype decision-support model trained
using available project data and/or documented synthetic railway maintenance data.
It is not validated for live Indian Railways safety-critical operational deployment.
Deterministic safety rules remain authoritative."
"""

import os
import csv
import json
import math
import random
from typing import List, Dict, Any, Tuple, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
TRAINING_CSV_PATH = os.path.join(DATA_DIR, "railsync_ml_training_data.csv")

DEPARTMENTS = ["TMS", "SMMS", "TDMS"]

DEFECT_TYPES_BY_DEPT = {
    "TMS": [
        "WELD_FRACTURE", "TRACK_TWIST", "RAIL_CORRUGATION", "SLEEPER_LOOSENING",
        "GAUGE_CORRECTION", "FISHPLATE_CRACK", "BALLAST_DEFICIENCY", "USFD_MICRO_CRACK",
        "SEJ_GAP_ABNORMAL", "TURNOUT_WEAR", "DRAINAGE_CLEARANCE", "LC_FLANGEWAY_CLEAN"
    ],
    "SMMS": [
        "POINT_MACHINE_FAILURE", "INTERLOCKING_CIRCUIT_FAULT", "AXLE_COUNTER_RESET",
        "SIGNAL_LAMP_FUSED", "TRACK_CIRCUIT_DROP", "RELAY_CHATTER", "CABLE_INSULATION_LOW",
        "POWER_SUPPLY_FLUCTUATION", "DATA_LOGGER_FAIL", "EARTH_LEAKAGE"
    ],
    "TDMS": [
        "OHE_DROPPER_SNAP", "CANTILEVER_INSULATOR_FLASH", "PANTOGRAPH_ENTANGLEMENT_RISK",
        "CATENARY_TENSION_LOW", "NEUTRAL_SECTION_ARCING", "CONTACT_WIRE_WEAR",
        "MAST_EARTHING_LOOSE", "FEEDER_BREAKER_TRIP", "ISOLATOR_SWITCH_JAM"
    ]
}

CORRIDORS = ["NDLS-HWH-01", "NDLS-CNB-07", "CNB-MGS-01", "HWH-MGS-03"]


class DatasetService:
    @staticmethod
    def generate_synthetic_dataset(
        num_samples: int = 1200,
        random_seed: int = 42,
        save_csv: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Generates a robust, realistic synthetic training dataset for failure risk classification.
        Target is multi-factorial, non-linear, and reflects physical railway degradation dynamics.
        """
        random.seed(random_seed)
        samples: List[Dict[str, Any]] = []

        for i in range(num_samples):
            record_id = f"RS-ML-{10000 + i}"
            dept = random.choices(DEPARTMENTS, weights=[0.45, 0.30, 0.25])[0]
            defect_type = random.choice(DEFECT_TYPES_BY_DEPT[dept])
            corridor = random.choice(CORRIDORS)

            # High severity correlated with specific hazardous defect types
            is_inherently_severe = defect_type in [
                "WELD_FRACTURE", "TRACK_TWIST", "POINT_MACHINE_FAILURE",
                "INTERLOCKING_CIRCUIT_FAULT", "OHE_DROPPER_SNAP", "PANTOGRAPH_ENTANGLEMENT_RISK"
            ]

            if is_inherently_severe:
                severity = random.choices([3, 4, 5], weights=[0.20, 0.45, 0.35])[0]
            else:
                severity = random.choices([1, 2, 3, 4], weights=[0.25, 0.35, 0.30, 0.10])[0]

            # Realistic feature generation
            asset_age_years = round(random.uniform(0.5, 38.0), 1)
            days_since_last_inspection = random.randint(3, 360)
            previous_failure_count = random.choices(
                [0, 1, 2, 3, 4, 5, 6, 7],
                weights=[0.35, 0.25, 0.15, 0.10, 0.07, 0.04, 0.02, 0.02]
            )[0]
            days_overdue = round(random.expovariate(1.0 / 3.5) if random.random() > 0.4 else 0.0, 1)
            days_overdue = min(35.0, days_overdue)

            traffic_density_rank = random.randint(1, 5)
            corridor_utilization_pct = round(random.uniform(40.0, 98.5), 1)
            maintenance_duration_mins = random.choice([30, 45, 60, 90, 120, 150, 180, 240])
            weather_risk_factor = round(random.uniform(0.05, 0.95), 2)

            # Non-linear Multi-factor Risk Equation (True underlying latent function + stochastic noise)
            sev_norm = (severity - 1.0) / 4.0  # 0.0 to 1.0
            fail_norm = min(1.0, previous_failure_count / 5.0)
            overdue_norm = min(1.0, days_overdue / 14.0)
            insp_norm = min(1.0, days_since_last_inspection / 240.0)
            traffic_norm = (traffic_density_rank - 1.0) / 4.0
            util_norm = (corridor_utilization_pct - 40.0) / 60.0
            age_norm = asset_age_years / 40.0

            # Departmental vulnerability bonus
            dept_risk = 0.05 if dept == "TMS" else (0.03 if dept == "SMMS" else 0.02)

            # Combined latent operational failure risk score
            latent_risk = (
                0.26 * sev_norm +
                0.20 * fail_norm +
                0.18 * overdue_norm +
                0.12 * insp_norm +
                0.08 * traffic_norm +
                0.06 * util_norm +
                0.05 * age_norm +
                0.05 * weather_risk_factor +
                dept_risk +
                random.gauss(0.0, 0.03)  # natural noise
            )
            failure_risk_prob = max(0.01, min(0.99, latent_risk))

            # Quantize into 4 balanced operational risk tiers
            if failure_risk_prob >= 0.56:
                risk_class = "CRITICAL"
            elif failure_risk_prob >= 0.38:
                risk_class = "HIGH"
            elif failure_risk_prob >= 0.22:
                risk_class = "MEDIUM"
            else:
                risk_class = "LOW"

            sample = {
                "record_id": record_id,
                "department": dept,
                "defect_type": defect_type,
                "corridor_id": corridor,
                "severity": severity,
                "days_overdue": days_overdue,
                "asset_age_years": asset_age_years,
                "days_since_last_inspection": days_since_last_inspection,
                "previous_failure_count": previous_failure_count,
                "traffic_density_rank": traffic_density_rank,
                "corridor_utilization_pct": corridor_utilization_pct,
                "maintenance_duration_mins": maintenance_duration_mins,
                "weather_risk_factor": weather_risk_factor,
                "failure_risk_probability": round(failure_risk_prob, 4),
                "failure_risk_class": risk_class,
                "dataset_type": "RailSync synthetic prototype training data"
            }
            samples.append(sample)

        if save_csv:
            os.makedirs(os.path.dirname(TRAINING_CSV_PATH), exist_ok=True)
            with open(TRAINING_CSV_PATH, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=list(samples[0].keys()))
                writer.writeheader()
                writer.writerows(samples)

        return samples

    @staticmethod
    def load_dataset() -> List[Dict[str, Any]]:
        """
        Loads the training dataset from disk or generates it deterministically if not present.
        """
        if os.path.exists(TRAINING_CSV_PATH):
            samples = []
            with open(TRAINING_CSV_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Cast types appropriately
                    item = {
                        "record_id": row["record_id"],
                        "department": row["department"],
                        "defect_type": row["defect_type"],
                        "corridor_id": row.get("corridor_id", "NDLS-HWH-01"),
                        "severity": int(row["severity"]),
                        "days_overdue": float(row["days_overdue"]),
                        "asset_age_years": float(row["asset_age_years"]),
                        "days_since_last_inspection": int(row["days_since_last_inspection"]),
                        "previous_failure_count": int(row["previous_failure_count"]),
                        "traffic_density_rank": int(row["traffic_density_rank"]),
                        "corridor_utilization_pct": float(row["corridor_utilization_pct"]),
                        "maintenance_duration_mins": int(row["maintenance_duration_mins"]),
                        "weather_risk_factor": float(row["weather_risk_factor"]),
                        "failure_risk_probability": float(row["failure_risk_probability"]),
                        "failure_risk_class": row["failure_risk_class"],
                        "dataset_type": row.get("dataset_type", "RailSync synthetic prototype training data")
                    }
                    samples.append(item)
            return samples
        else:
            return DatasetService.generate_synthetic_dataset(num_samples=1200, save_csv=True)

    @staticmethod
    def get_dataset_summary() -> Dict[str, Any]:
        data = DatasetService.load_dataset()
        class_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        dept_counts = {"TMS": 0, "SMMS": 0, "TDMS": 0}

        for row in data:
            c = row.get("failure_risk_class", "MEDIUM")
            if c in class_counts:
                class_counts[c] += 1
            d = row.get("department", "TMS")
            if d in dept_counts:
                dept_counts[d] += 1

        return {
            "total_records": len(data),
            "dataset_type": "RailSync synthetic prototype training data",
            "class_distribution": class_counts,
            "department_distribution": dept_counts,
            "features_available": [
                "department", "defect_type", "severity", "days_overdue",
                "asset_age_years", "days_since_last_inspection", "previous_failure_count",
                "traffic_density_rank", "corridor_utilization_pct", "maintenance_duration_mins",
                "weather_risk_factor"
            ],
            "target_variable": "failure_risk_class (LOW, MEDIUM, HIGH, CRITICAL)"
        }
