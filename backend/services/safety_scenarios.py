"""
RailSync Authoritative Safety Demonstration Scenarios.
Implements the 7 core safety test cases proving the safety boundaries of RailSync:

1. SCENARIO 1 — EMERGENCY RAIL FRACTURE (Immediate Emergency Classification, 2h deadline, Safety Override)
2. SCENARIO 2 — MANDATORY HIGH-RISK DEFECT (High-risk geometry, mandatory inclusion, scheduled before deadline)
3. SCENARIO 3 — SAFE MULTI-DEPARTMENT BUNDLING (Compatible TMS + SMMS bundled into unified window)
4. SCENARIO 4 — UNSAFE BUNDLING PREVENTION (Conflicting electrical/mechanical isolations rejected)
5. SCENARIO 5 — DEADLINE FAILURE / UNSCHEDULABLE SAFETY CONDITION (Returns NO_SAFE_PLAN, never false success)
6. SCENARIO 6 — EMERGENCY PREEMPTION (Routine block shifted safely to accommodate critical repair)
7. SCENARIO 7 — POST-OPTIMIZATION SAFETY PLAN VALIDATION (Rejection of invalid candidate plan with violations)
"""

import datetime
from typing import Dict, List, Any

from backend.services.safety_guardrail_service import SafetyGuardrailService
from backend.optimizer import CPOrToolsBlockOptimizer
from backend.core.safety_config import SafetyConfig


class SafetyScenarioRunner:
    @classmethod
    def run_scenario_1_emergency_fracture(cls) -> Dict[str, Any]:
        """
        Scenario 1: Emergency Rail Fracture.
        Proves: Immediate EMERGENCY classification, 2.0h max response window, Safety Override active.
        """
        now = datetime.datetime.now()
        req = {
            "id": 101,
            "department_code": "TMS",
            "source_system": "TMS",
            "asset_id": "TRK-01",
            "defect_type": "RAIL_FRACTURE",
            "work_type": "EMERGENCY_RAIL_REPAIR",
            "defect_severity": 5,
            "notes": "Critical transverse rail fracture detected at KM 12.4 by ultrasonic flaw detector",
            "requested_start_time": now.isoformat(),
            "duration_minutes": 90,
            "corridor_id": "NDLS-HWH-01"
        }

        safety_eval = SafetyGuardrailService.evaluate_request_safety(req)
        verified = (
            safety_eval["safety_classification"] == "EMERGENCY" and
            safety_eval["is_emergency"] is True and
            safety_eval["is_mandatory"] is True and
            safety_eval["safety_override"] is True and
            safety_eval["max_response_hours"] <= 2.0
        )

        return {
            "scenario_id": "SCENARIO_1_EMERGENCY_FRACTURE",
            "title": "Emergency Rail Fracture Safety Boundary",
            "description": "Validates that a catastrophic rail fracture immediately triggers EMERGENCY classification, 2-hour response window, and non-negotiable safety override.",
            "request": req,
            "safety_evaluation": safety_eval,
            "verified": verified,
            "explanation": (
                f"Defect '{req['defect_type']}' on {req['asset_id']} classified as {safety_eval['safety_classification']} "
                f"with effective deadline at {safety_eval['effective_deadline']}. Isolation required: {', '.join(safety_eval['isolation_requirements'])}."
            )
        }

    @classmethod
    def run_scenario_2_mandatory_defect(cls) -> Dict[str, Any]:
        """
        Scenario 2: Mandatory High-Risk Defect.
        Proves: High-risk track geometry triggers MANDATORY classification and must be scheduled before deadline.
        """
        now = datetime.datetime.now()
        due = now + datetime.timedelta(hours=14)
        req = {
            "id": 102,
            "department_code": "TMS",
            "source_system": "TMS",
            "asset_id": "TRK-02",
            "defect_type": "TRACK_GEOMETRY_EXCEEDANCE",
            "work_type": "TRACK_TAMPING_CORRECTION",
            "defect_severity": 4,
            "notes": "Gauge exceedance +18mm and vertical twist exceeding RDSO maintenance threshold",
            "requested_start_time": now.isoformat(),
            "due_date": due.isoformat(),
            "duration_minutes": 120,
            "corridor_id": "NDLS-HWH-01"
        }

        safety_eval = SafetyGuardrailService.evaluate_request_safety(req)
        verified = (
            safety_eval["safety_classification"] == "MANDATORY" and
            safety_eval["is_mandatory"] is True and
            safety_eval["safety_override"] is True
        )

        return {
            "scenario_id": "SCENARIO_2_MANDATORY_DEFECT",
            "title": "Mandatory High-Risk Track Defect",
            "description": "Confirms that high-risk track geometry defects cannot be omitted or classified as optional routine work.",
            "request": req,
            "safety_evaluation": safety_eval,
            "verified": verified,
            "explanation": f"Mandatory requirement confirmed: {safety_eval['summary']} (Deadline: {safety_eval['effective_deadline']})"
        }

    @classmethod
    def run_scenario_3_safe_bundling(cls) -> Dict[str, Any]:
        """
        Scenario 3: Safe Multi-Department Bundling.
        Proves: Compatible TMS track weld + SMMS signal bond check in same section bundle safely.
        """
        now = datetime.datetime.now()
        req_tms = {
            "id": 103,
            "department_code": "TMS",
            "source_system": "TMS",
            "asset_id": "TRK-01",
            "work_type": "THERMIT_WELD_REPAIR",
            "notes": "Rail weld replacement at KM 8.5",
            "requested_start_time": now.isoformat(),
            "duration_minutes": 90,
            "isolation_requirements": ["TRACK_POSSESSION"]
        }
        req_smms = {
            "id": 104,
            "department_code": "SMMS",
            "source_system": "SMMS",
            "asset_id": "SIG-44",
            "work_type": "INSULATED_JOINT_INSPECTION",
            "notes": "Signal bond resistance check and impedance bond renewal at KM 8.5",
            "requested_start_time": now.isoformat(),
            "duration_minutes": 60,
            "isolation_requirements": ["INTERLOCKING_DISCONNECTION"]
        }

        asset_tms = {"asset_id": "TRK-01", "start_km": 0.0, "end_km": 15.0}
        asset_smms = {"asset_id": "SIG-44", "start_km": 8.5, "end_km": 8.6}

        compat = SafetyGuardrailService.check_bundle_compatibility(
            req_tms, req_smms, asset_a=asset_tms, asset_b=asset_smms
        )

        verified = compat["is_compatible"] is True and compat["status"] in ["COMPATIBLE", "CONDITIONAL_COMPATIBLE"]

        return {
            "scenario_id": "SCENARIO_3_SAFE_BUNDLING",
            "title": "Safe Multi-Department Bundling (TMS + SMMS)",
            "description": "Verifies that compatible track and signal works sharing the same corridor section are approved for joint possession bundling.",
            "request_a": req_tms,
            "request_b": req_smms,
            "compatibility_result": compat,
            "verified": verified,
            "explanation": f"Bundling Status: {compat['status']}. {'; '.join(compat['reasons'])}"
        }

    @classmethod
    def run_scenario_4_unsafe_bundling_prevention(cls) -> Dict[str, Any]:
        """
        Scenario 4: Unsafe Bundling Prevention.
        Proves: TMS heavy crane lift under live wire vs TDMS power block isolation conflict is rejected.
        """
        req_tms = {
            "id": 105,
            "department_code": "TMS",
            "source_system": "TMS",
            "asset_id": "TRK-01",
            "work_type": "LIVE_TRACTION_HAULAGE",
            "notes": "Electric locomotive shunting of heavy rail train",
            "isolation_requirements": ["TRACK_POSSESSION"]
        }
        req_tdms = {
            "id": 106,
            "department_code": "TDMS",
            "source_system": "TDMS",
            "asset_id": "OHE-09",
            "work_type": "POWER_BLOCK_ISOLATION",
            "notes": "Complete 25kV de-energization for catenary wire stringing",
            "isolation_requirements": ["POWER_BLOCK_ISOLATION"]
        }

        compat = SafetyGuardrailService.check_bundle_compatibility(req_tms, req_tdms)
        verified = compat["is_compatible"] is False and compat["status"] == "INCOMPATIBLE"

        return {
            "scenario_id": "SCENARIO_4_UNSAFE_BUNDLING_PREVENTION",
            "title": "Unsafe Bundling Prevention (Conflicting Isolations)",
            "description": "Proves that conflicting work conditions (e.g. electric locomotive move requiring live 25kV power vs OHE power de-energization) are rejected by the safety matrix.",
            "request_a": req_tms,
            "request_b": req_tdms,
            "compatibility_result": compat,
            "verified": verified,
            "explanation": f"Rejected as {compat['status']}: {'; '.join(compat['reasons'])}"
        }

    @classmethod
    def run_scenario_5_deadline_failure_nosafeschedule(cls) -> Dict[str, Any]:
        """
        Scenario 5: Deadline Failure / Non-Schedulable Condition.
        Proves: When mandatory safety work cannot be scheduled before deadline due to continuous Rajdhani traffic,
        the optimizer returns NO_SAFE_PLAN with explicit escalation, never a false success.
        """
        now = datetime.datetime.now()
        # Mandatory request with 60 min duration and 1.5h deadline
        req = {
            "id": 107,
            "department_code": "TMS",
            "source_system": "TMS",
            "asset_id": "TRK-01",
            "defect_type": "RAIL_FRACTURE",
            "work_type": "EMERGENCY_RAIL_REPAIR",
            "defect_severity": 5,
            "requested_start_time": now.isoformat(),
            "duration_minutes": 60,
            "reported_at": (now - datetime.timedelta(hours=1.5)).isoformat(), # 30 mins left on 2h deadline!
            "corridor_id": "NDLS-HWH-01"
        }

        # Train schedule completely blocking the 30-minute window
        blocking_trains = [
            {
                "id": 901,
                "train_number": "12301",
                "name": "Howrah Rajdhani Express",
                "priority_class": "RAJDHANI",
                "corridor_id": "NDLS-HWH-01",
                "arrival_window_start": now.isoformat(),
                "departure_window_end": (now + datetime.timedelta(hours=2)).isoformat(),
                "status": "RUNNING"
            }
        ]

        optimizer = CPOrToolsBlockOptimizer([req], blocking_trains)
        solve_result = optimizer.solve()

        verified = solve_result.get("status") == "NO_SAFE_PLAN" and solve_result.get("success") is False

        return {
            "scenario_id": "SCENARIO_5_DEADLINE_FAILURE",
            "title": "Fail-Safe Rejection on Unachievable Deadline (NO_SAFE_PLAN)",
            "description": "Proves that the optimizer will NEVER return a false 'optimized plan' when mandatory safety work cannot be safely scheduled before its deadline.",
            "request": req,
            "optimizer_result": solve_result,
            "verified": verified,
            "explanation": solve_result.get("message")
        }

    @classmethod
    def run_scenario_6_emergency_preemption(cls) -> Dict[str, Any]:
        """
        Scenario 6: Emergency Preemption Pipeline.
        Proves: Incoming emergency fracture safely preempts routine maintenance and inserts an immediate emergency block.
        """
        now = datetime.datetime.now()
        routine_block = {
            "id": 2001,
            "corridor_id": "NDLS-HWH-01",
            "bundled_request_ids": [201],
            "scheduled_start": (now + datetime.timedelta(minutes=15)).isoformat(),
            "scheduled_end": (now + datetime.timedelta(minutes=105)).isoformat(),
            "allocated_safety_buffer": 15,
            "controller_approval_status": "APPROVED",
            "saved_block_hours": 0.0,
            "bundled_departments": ["TMS"],
            "urgency_score": 0.3
        }

        emergency_req = {
            "id": 999,
            "department_code": "TMS",
            "source_system": "TMS",
            "asset_id": "TRK-01",
            "defect_type": "RAIL_FRACTURE",
            "work_type": "EMERGENCY_RAIL_REPAIR",
            "defect_severity": 5,
            "requested_start_time": now.isoformat(),
            "duration_minutes": 60,
            "corridor_id": "NDLS-HWH-01"
        }

        trains = [
            {
                "id": 1,
                "train_number": "12260",
                "name": "Duronto Express",
                "priority_class": "EXPRESS",
                "corridor_id": "NDLS-HWH-01",
                "arrival_window_start": (now + datetime.timedelta(hours=4)).isoformat(),
                "departure_window_end": (now + datetime.timedelta(hours=5)).isoformat(),
                "status": "RUNNING"
            }
        ]

        preemption_result = SafetyGuardrailService.preempt_and_replan_emergency(
            emergency_req,
            [routine_block],
            [{"id": 201, "asset_id": "TRK-02", "duration_minutes": 90, "defect_severity": 2}],
            trains
        )

        verified = (
            preemption_result["success"] is True and
            preemption_result["status"] == "EMERGENCY_PREEMPTION_COMPLETED" and
            len(preemption_result["revised_blocks"]) >= 2
        )

        return {
            "scenario_id": "SCENARIO_6_EMERGENCY_PREEMPTION",
            "title": "Emergency Preemption & Schedule Restructuring",
            "description": "Demonstrates dynamic insertion of an emergency track repair block, safely shifting routine maintenance slots forward while preventing train collisions.",
            "emergency_request": emergency_req,
            "preemption_result": preemption_result,
            "verified": verified,
            "explanation": preemption_result["message"]
        }

    @classmethod
    def run_scenario_7_post_optimization_validation(cls) -> Dict[str, Any]:
        """
        Scenario 7: Post-Optimization Safety Plan Validation.
        Proves: Independent validator rejects a flawed candidate plan that violates Rajdhani headway buffers.
        """
        now = datetime.datetime.now()
        # Flawed block deliberately intersecting Rajdhani window
        flawed_block = {
            "id": 3001,
            "corridor_id": "NDLS-HWH-01",
            "bundled_request_ids": [301],
            "scheduled_start": (now + datetime.timedelta(hours=2)).isoformat(),
            "scheduled_end": (now + datetime.timedelta(hours=3, minutes=30)).isoformat(),
            "allocated_safety_buffer": 15,
            "controller_approval_status": "PENDING",
            "saved_block_hours": 0.0,
            "bundled_departments": ["TMS"]
        }

        trains = [
            {
                "id": 1,
                "train_number": "12301",
                "name": "Howrah Rajdhani Express",
                "priority_class": "RAJDHANI",
                "corridor_id": "NDLS-HWH-01",
                "arrival_window_start": (now + datetime.timedelta(hours=2, minutes=15)).isoformat(),
                "departure_window_end": (now + datetime.timedelta(hours=3, minutes=15)).isoformat(),
                "status": "RUNNING"
            }
        ]

        requests = [{"id": 301, "asset_id": "TRK-01", "duration_minutes": 90, "defect_severity": 3}]

        val_report = SafetyGuardrailService.validate_optimized_plan(
            [flawed_block], requests, trains
        )

        verified = val_report["passed"] is False and val_report["violations_count"] > 0

        return {
            "scenario_id": "SCENARIO_7_POST_OPTIMIZATION_VALIDATION",
            "title": "Post-Optimization Independent Safety Validation",
            "description": "Proves that any candidate schedule violating train headway safety buffers is strictly flagged and rejected by the independent safety validator.",
            "candidate_block": flawed_block,
            "validation_report": val_report,
            "verified": verified,
            "explanation": f"Safety Validator caught {val_report['violations_count']} violations: {'; '.join(val_report['violations'])}"
        }

    @classmethod
    def run_all_scenarios(cls) -> Dict[str, Any]:
        """
        Executes all 7 demonstration scenarios and summarizes compliance.
        """
        s1 = cls.run_scenario_1_emergency_fracture()
        s2 = cls.run_scenario_2_mandatory_defect()
        s3 = cls.run_scenario_3_safe_bundling()
        s4 = cls.run_scenario_4_unsafe_bundling_prevention()
        s5 = cls.run_scenario_5_deadline_failure_nosafeschedule()
        s6 = cls.run_scenario_6_emergency_preemption()
        s7 = cls.run_scenario_7_post_optimization_validation()

        all_scenarios = [s1, s2, s3, s4, s5, s6, s7]
        all_passed = all(s["verified"] for s in all_scenarios)

        return {
            "engine": "RailSync Safety Guardrail Engine",
            "version": "2.0.0",
            "total_scenarios": len(all_scenarios),
            "passed_scenarios": sum(1 for s in all_scenarios if s["verified"]),
            "all_verified": all_passed,
            "prototype_disclaimer": SafetyConfig.PROTOTYPE_DISCLAIMER,
            "scenarios": all_scenarios
        }
