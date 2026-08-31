"""
RailSync Prioritization Scenarios: Standardized Demonstration Scenarios.
Provides deterministic testing and demonstration of the 5 canonical railway maintenance scenarios:
  1. Scenario A: Critical rail fracture (Severity 5, TMS) -> Safety override active, CRITICAL tier.
  2. Scenario B: Medium defect approaching SLA deadline (<12h, SMMS) -> High predictive urgency, HIGH tier.
  3. Scenario C: Moderate task on high-traffic corridor with Rajdhani trains (NDLS-HWH-01) -> High operational impact.
  4. Scenario D: Low-severity, recently reported task on low-traffic branch -> LOW tier.
  5. Scenario E: Same severity defect on High-Density vs Low-Density Corridor -> Demonstrates COA traffic sensitivity.
"""

import datetime
from typing import Dict, Any, List
from backend.services.prioritization_service import PrioritizationService

def get_demo_train_schedules() -> List[Dict[str, Any]]:
    now = datetime.datetime.now()
    return [
        {
            "train_number": "12301",
            "name": "Howrah Rajdhani Express",
            "priority_class": "RAJDHANI",
            "corridor_id": "NDLS-HWH-01",
            "arrival_window_start": (now + datetime.timedelta(hours=2)).isoformat(),
            "departure_window_end": (now + datetime.timedelta(hours=3, minutes=30)).isoformat(),
            "delay_minutes": 0,
            "status": "RUNNING"
        },
        {
            "train_number": "12260",
            "name": "Sealdah Duronto Express",
            "priority_class": "RAJDHANI",
            "corridor_id": "NDLS-HWH-01",
            "arrival_window_start": (now + datetime.timedelta(hours=4)).isoformat(),
            "departure_window_end": (now + datetime.timedelta(hours=5, minutes=15)).isoformat(),
            "delay_minutes": 0,
            "status": "RUNNING"
        },
        {
            "train_number": "12423",
            "name": "Dibrugarh Rajdhani",
            "priority_class": "RAJDHANI",
            "corridor_id": "NDLS-HWH-01",
            "arrival_window_start": (now + datetime.timedelta(hours=7)).isoformat(),
            "departure_window_end": (now + datetime.timedelta(hours=8, minutes=30)).isoformat(),
            "delay_minutes": 10,
            "status": "RUNNING"
        },
        {
            "train_number": "12876",
            "name": "Neelachal Express",
            "priority_class": "EXPRESS",
            "corridor_id": "NDLS-HWH-01",
            "arrival_window_start": (now + datetime.timedelta(hours=9)).isoformat(),
            "departure_window_end": (now + datetime.timedelta(hours=10)).isoformat(),
            "delay_minutes": 0,
            "status": "RUNNING"
        },
        {
            "train_number": "54321",
            "name": "Branch Local Passenger",
            "priority_class": "EXPRESS",
            "corridor_id": "BRANCH-LINE-09",
            "arrival_window_start": (now + datetime.timedelta(hours=12)).isoformat(),
            "departure_window_end": (now + datetime.timedelta(hours=13)).isoformat(),
            "delay_minutes": 0,
            "status": "RUNNING"
        }
    ]


class PrioritizationScenarioRunner:
    @classmethod
    def run_all_scenarios(cls) -> Dict[str, Any]:
        trains = get_demo_train_schedules()
        now = datetime.datetime.now()

        # -------------------------------------------------------------
        # SCENARIO A: Critical rail fracture (Severity 5, TMS)
        # -------------------------------------------------------------
        scenario_a_req = {
            "request_id": "DEMO-SCENARIO-A",
            "source_system": "TMS",
            "department_code": "TMS",
            "asset_id": "TRK-01",
            "corridor_id": "NDLS-HWH-01",
            "defect_type": "RAIL FRACTURE",
            "work_type": "EMERGENCY_REPAIR",
            "notes": "Severe rail fracture observed at weld junction KM 8.2",
            "defect_severity": 5,
            "duration_minutes": 90,
            "reported_at": (now - datetime.timedelta(hours=1)).isoformat(),
            "requested_start_time": (now + datetime.timedelta(hours=1)).isoformat()
        }
        res_a = PrioritizationService.evaluate_request(scenario_a_req, train_schedules=trains)

        # -------------------------------------------------------------
        # SCENARIO B: Medium defect approaching SLA deadline (<12h, SMMS)
        # -------------------------------------------------------------
        scenario_b_req = {
            "request_id": "DEMO-SCENARIO-B",
            "source_system": "SMMS",
            "department_code": "SMMS",
            "asset_id": "SIG-44",
            "corridor_id": "NDLS-HWH-01",
            "defect_type": "POINT MACHINE FAILURE",
            "work_type": "CORRECTIVE_MAINTENANCE",
            "notes": "Point machine 12B sluggish throw time, approaching mandatory SLA window",
            "defect_severity": 3,
            "duration_minutes": 60,
            "reported_at": (now - datetime.timedelta(hours=18)).isoformat(),
            "due_date": (now + datetime.timedelta(hours=6)).isoformat(), # SLA due in 6 hours!
            "requested_start_time": (now + datetime.timedelta(hours=2)).isoformat()
        }
        res_b = PrioritizationService.evaluate_request(scenario_b_req, train_schedules=trains)

        # -------------------------------------------------------------
        # SCENARIO C: Moderate task on high-traffic corridor (NDLS-HWH-01)
        # -------------------------------------------------------------
        scenario_c_req = {
            "request_id": "DEMO-SCENARIO-C",
            "source_system": "TDMS",
            "department_code": "TDMS",
            "asset_id": "OHE-09",
            "corridor_id": "NDLS-HWH-01",
            "defect_type": "CATENARY WEAR",
            "work_type": "ROUTINE_ADJUSTMENT",
            "notes": "Minor tension adjustment on main high-speed corridor",
            "defect_severity": 3,
            "duration_minutes": 120,
            "reported_at": (now - datetime.timedelta(hours=4)).isoformat(),
            "requested_start_time": (now + datetime.timedelta(hours=3)).isoformat()
        }
        res_c = PrioritizationService.evaluate_request(scenario_c_req, train_schedules=trains)

        # -------------------------------------------------------------
        # SCENARIO D: Low-severity, recently reported task (Branch line)
        # -------------------------------------------------------------
        scenario_d_req = {
            "request_id": "DEMO-SCENARIO-D",
            "source_system": "TMS",
            "department_code": "TMS",
            "asset_id": "TRK-BR-99",
            "corridor_id": "BRANCH-LINE-09",
            "defect_type": "BALLAST CLEANING",
            "work_type": "PREVENTIVE",
            "notes": "Routine minor ballast shoulder dressing on quiet feeder branch",
            "defect_severity": 1,
            "duration_minutes": 45,
            "reported_at": (now - datetime.timedelta(hours=1)).isoformat(),
            "due_date": (now + datetime.timedelta(days=7)).isoformat(),
            "requested_start_time": (now + datetime.timedelta(hours=12)).isoformat()
        }
        res_d = PrioritizationService.evaluate_request(scenario_d_req, train_schedules=trains)

        # -------------------------------------------------------------
        # SCENARIO E: Corridor Comparison (Identical defect on Trunk vs Branch)
        # -------------------------------------------------------------
        scenario_e_trunk = {
            "request_id": "DEMO-SCENARIO-E-TRUNK",
            "source_system": "TMS",
            "department_code": "TMS",
            "asset_id": "TRK-01",
            "corridor_id": "NDLS-HWH-01",
            "defect_type": "TRACK GEOMETRY",
            "work_type": "TAMPING",
            "notes": "Gauge deviation 4mm on Grand Trunk High Speed Trunk",
            "defect_severity": 3,
            "duration_minutes": 90,
            "reported_at": (now - datetime.timedelta(hours=5)).isoformat(),
            "requested_start_time": (now + datetime.timedelta(hours=2)).isoformat()
        }
        scenario_e_branch = {
            "request_id": "DEMO-SCENARIO-E-BRANCH",
            "source_system": "TMS",
            "department_code": "TMS",
            "asset_id": "TRK-BR-01",
            "corridor_id": "BRANCH-LINE-09",
            "defect_type": "TRACK GEOMETRY",
            "work_type": "TAMPING",
            "notes": "Gauge deviation 4mm on Branch Feeder Line",
            "defect_severity": 3,
            "duration_minutes": 90,
            "reported_at": (now - datetime.timedelta(hours=5)).isoformat(),
            "requested_start_time": (now + datetime.timedelta(hours=2)).isoformat()
        }
        res_e_trunk = PrioritizationService.evaluate_request(scenario_e_trunk, train_schedules=trains)
        res_e_branch = PrioritizationService.evaluate_request(scenario_e_branch, train_schedules=trains)

        return {
            "timestamp": now.isoformat(),
            "scenarios": [
                {
                    "id": "SCENARIO_A",
                    "title": "Scenario A: Critical Rail Fracture (Safety Override)",
                    "description": "Demonstrates mandatory safety override for emergency rail fracture.",
                    "request": scenario_a_req,
                    "evaluation": res_a,
                    "verified": res_a["safety_override"] is True and res_a["priority_level"] == "CRITICAL"
                },
                {
                    "id": "SCENARIO_B",
                    "title": "Scenario B: Approaching SLA Deadline (Predictive Urgency)",
                    "description": "Demonstrates SLA proximity and degradation escalation for impending breach.",
                    "request": scenario_b_req,
                    "evaluation": res_b,
                    "verified": res_b["urgency_score"] >= 60.0
                },
                {
                    "id": "SCENARIO_C",
                    "title": "Scenario C: High-Traffic Corridor Density (Operational Impact)",
                    "description": "Demonstrates operational impact boost on corridors hosting Rajdhani trains.",
                    "request": scenario_c_req,
                    "evaluation": res_c,
                    "verified": res_c["impact_score"] >= 60.0
                },
                {
                    "id": "SCENARIO_D",
                    "title": "Scenario D: Low-Severity Routine Task (Low Tier)",
                    "description": "Demonstrates low criticality, low urgency, and low impact on branch line.",
                    "request": scenario_d_req,
                    "evaluation": res_d,
                    "verified": res_d["priority_level"] == "LOW"
                },
                {
                    "id": "SCENARIO_E",
                    "title": "Scenario E: Corridor Sensitivity Comparison",
                    "description": "Compares identical Severity 3 defects on High-Density Trunk vs Quiet Branch.",
                    "trunk_evaluation": res_e_trunk,
                    "branch_evaluation": res_e_branch,
                    "impact_difference": round(res_e_trunk["impact_score"] - res_e_branch["impact_score"], 1),
                    "priority_difference": round(res_e_trunk["priority_score"] - res_e_branch["priority_score"], 1),
                    "verified": res_e_trunk["impact_score"] > res_e_branch["impact_score"]
                }
            ]
        }
