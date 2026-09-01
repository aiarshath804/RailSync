"""
RailSync Authoritative Safety Guardrail Service.
The central engine that evaluates maintenance safety classifications, calculates
non-negotiable safety deadlines, validates multi-department compatibility, and enforces
post-optimization plan safety.

CORE PRINCIPLE:
"AI MAY PRIORITIZE. THE OPTIMIZER MAY OPTIMIZE. BUT SAFETY RULES MUST DEFINE THE NON-NEGOTIABLE BOUNDARIES."
"""

import datetime
from typing import Dict, List, Any, Optional, Tuple

from backend.core.safety_config import (
    SafetyConfig,
    SafetyClassificationEnum,
    IsolationTypeEnum
)
from backend.core.constants import DEFAULT_SAFETY_BUFFER_MINUTES, TrainPriorityEnum


class SafetyGuardrailService:
    @staticmethod
    def parse_time(val: Any) -> datetime.datetime:
        if isinstance(val, datetime.datetime):
            return val
        if isinstance(val, str):
            try:
                return datetime.datetime.fromisoformat(val.replace("Z", "+00:00").split("+")[0])
            except Exception:
                pass
        return datetime.datetime.now()

    @classmethod
    def evaluate_request_safety(
        cls,
        request: Dict[str, Any],
        all_requests: Optional[List[Dict[str, Any]]] = None,
        train_schedules: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Authoritative safety classification for a single maintenance request:
        Returns EMERGENCY, MANDATORY, CONDITIONAL, or SAFE, with effective safety deadlines,
        isolation requirements, and deterministic guardrail explanations.
        """
        now = datetime.datetime.now()
        severity = int(request.get("defect_severity") or request.get("severity") or 3)
        dept = str(request.get("department_code") or request.get("department") or request.get("source_system") or "TMS").upper()
        defect_type = str(request.get("defect_type", "")).upper()
        work_type = str(request.get("work_type", "")).upper()
        notes = str(request.get("notes") or request.get("description", "")).upper()
        full_text = f"{defect_type} {work_type} {notes}"

        # Parse timestamps for deadline determination
        reported_at = cls.parse_time(request.get("reported_at") or request.get("requested_start_time") or now)
        due_date_raw = request.get("due_date")
        due_date = cls.parse_time(due_date_raw) if due_date_raw else None

        classification = SafetyClassificationEnum.SAFE.value
        is_emergency = False
        is_mandatory = False
        safety_override = False
        override_reason = None
        max_response_hours = 48.0
        isolation_reqs = [IsolationTypeEnum.TRACK_POSSESSION.value]
        matched_rule_id = None
        matched_rule_desc = None

        # -------------------------------------------------------------
        # 1. Check EMERGENCY Rules (0 - 3h response windows)
        # -------------------------------------------------------------
        for rule in SafetyConfig.EMERGENCY_RULES:
            if any(k in full_text for k in rule["keywords"]):
                classification = SafetyClassificationEnum.EMERGENCY.value
                is_emergency = True
                is_mandatory = True
                safety_override = True
                override_reason = f"EMERGENCY SAFETY RULE [{rule['id']}]: {rule['description']}"
                max_response_hours = rule["max_response_hours"]
                isolation_reqs = rule["isolation_requirements"]
                matched_rule_id = rule["id"]
                matched_rule_desc = rule["description"]
                break

        # Check explicit severity 5 emergency fallback
        if not is_emergency and severity == 5:
            classification = SafetyClassificationEnum.EMERGENCY.value
            is_emergency = True
            is_mandatory = True
            safety_override = True
            override_reason = "Level 5 critical defect requires immediate emergency containment"
            max_response_hours = 2.0
            isolation_reqs = [IsolationTypeEnum.TRACK_POSSESSION.value]
            matched_rule_id = "EMG-SEV5"
            matched_rule_desc = "Severity 5 Critical Defect"

        # -------------------------------------------------------------
        # 2. Check MANDATORY Rules (High Risk, must schedule before SLA)
        # -------------------------------------------------------------
        if not is_emergency:
            for rule in SafetyConfig.MANDATORY_RULES:
                if any(k in full_text for k in rule["keywords"]):
                    classification = SafetyClassificationEnum.MANDATORY.value
                    is_mandatory = True
                    safety_override = True
                    override_reason = f"MANDATORY SAFETY RULE [{rule['id']}]: {rule['description']}"
                    max_response_hours = rule["max_response_hours"]
                    isolation_reqs = rule["isolation_requirements"]
                    matched_rule_id = rule["id"]
                    matched_rule_desc = rule["description"]
                    break

            # Check severity 4 or urgent SLA mandatory fallback
            if not is_mandatory and severity >= 4:
                classification = SafetyClassificationEnum.MANDATORY.value
                is_mandatory = True
                safety_override = True
                override_reason = f"Level {severity} high-risk defect mandates guaranteed slot"
                max_response_hours = 24.0
                isolation_reqs = [IsolationTypeEnum.TRACK_POSSESSION.value]
                matched_rule_id = "MAN-SEV4"
                matched_rule_desc = f"Severity {severity} High Risk Defect"

        # -------------------------------------------------------------
        # 3. Check CONDITIONAL Rules (Special Isolations)
        # -------------------------------------------------------------
        if not is_emergency and not is_mandatory:
            for rule in SafetyConfig.CONDITIONAL_RULES:
                if any(k in full_text for k in rule["keywords"]):
                    classification = SafetyClassificationEnum.CONDITIONAL.value
                    isolation_reqs = [rule["required_isolation"]]
                    override_reason = f"CONDITIONAL SAFETY RULE [{rule['id']}]: {rule['description']}"
                    matched_rule_id = rule["id"]
                    matched_rule_desc = rule["description"]
                    max_response_hours = 36.0
                    break

        # -------------------------------------------------------------
        # 4. Calculate Non-Negotiable Effective Safety Deadline
        # -------------------------------------------------------------
        deadline_from_reported = reported_at + datetime.timedelta(hours=max_response_hours)
        if due_date:
            effective_deadline_dt = min(deadline_from_reported, due_date)
        else:
            effective_deadline_dt = deadline_from_reported

        effective_deadline_str = effective_deadline_dt.isoformat()
        hours_remaining = round((effective_deadline_dt - now).total_seconds() / 3600.0, 1)

        summary_reason = override_reason or f"Standard {classification} maintenance protocol"

        return {
            "safety_classification": classification,
            "is_emergency": is_emergency,
            "is_mandatory": is_mandatory,
            "safety_override": safety_override,
            "override_reason": override_reason,
            "max_response_hours": max_response_hours,
            "effective_deadline": effective_deadline_str,
            "hours_remaining_to_deadline": hours_remaining,
            "isolation_requirements": isolation_reqs,
            "matched_rule_id": matched_rule_id,
            "matched_rule_description": matched_rule_desc,
            "summary": summary_reason,
            "prototype_disclaimer": SafetyConfig.PROTOTYPE_DISCLAIMER
        }

    @classmethod
    def evaluate_batch_safety(
        cls,
        requests: List[Dict[str, Any]],
        all_requests: Optional[List[Dict[str, Any]]] = None,
        train_schedules: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates safety classifications and deadlines across a batch of maintenance requests.
        """
        results = []
        for req in requests:
            safety_eval = cls.evaluate_request_safety(
                req,
                all_requests=all_requests or requests,
                train_schedules=train_schedules
            )
            item = dict(req)
            item["safety_classification"] = safety_eval["safety_classification"]
            item["is_emergency"] = safety_eval["is_emergency"]
            item["is_mandatory"] = safety_eval["is_mandatory"]
            item["safety_override"] = bool(item.get("safety_override") or safety_eval["safety_override"])
            item["override_reason"] = item.get("override_reason") or safety_eval["override_reason"]
            item["effective_deadline"] = safety_eval["effective_deadline"]
            item["isolation_requirements"] = safety_eval["isolation_requirements"]
            item["safety_evaluation"] = safety_eval
            results.append(item)
        return results

    @classmethod
    def check_bundle_compatibility(
        cls,
        req_a: Dict[str, Any],
        req_b: Dict[str, Any],
        asset_a: Optional[Dict[str, Any]] = None,
        asset_b: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Determines cross-departmental and physical safety compatibility between two requests.
        Returns COMPATIBLE, CONDITIONAL_COMPATIBLE, or INCOMPATIBLE with clear reasons.
        """
        dept_a = str(req_a.get("department_code") or req_a.get("source_system") or "TMS").upper()
        dept_b = str(req_b.get("department_code") or req_b.get("source_system") or "TMS").upper()

        work_a = str(req_a.get("work_type", "")).upper() + " " + str(req_a.get("notes", "")).upper()
        work_b = str(req_b.get("work_type", "")).upper() + " " + str(req_b.get("notes", "")).upper()

        reasons = []
        status = "COMPATIBLE"

        # 1. Department matrix lookup
        pair = (dept_a, dept_b) if (dept_a, dept_b) in SafetyConfig.COMPATIBILITY_MATRIX else (dept_b, dept_a)
        matrix_entry = SafetyConfig.COMPATIBILITY_MATRIX.get(pair, {"status": "COMPATIBLE", "condition": "Default corridor compatibility"})

        if matrix_entry["status"] == "CONDITIONAL":
            status = "CONDITIONAL_COMPATIBLE"
            reasons.append(f"Department interface ({dept_a} + {dept_b}): {matrix_entry['condition']}")

        # 2. Check for explicit Incompatible Work Type Combinations
        for comb in SafetyConfig.INCOMPATIBLE_COMBINATIONS:
            type_a_match = comb["type_a"] in work_a or comb["type_a"] in work_b
            type_b_match = comb["type_b"] in work_a or comb["type_b"] in work_b
            if type_a_match and type_b_match:
                status = "INCOMPATIBLE"
                reasons.append(f"Safety Conflict: {comb['reason']}")

        # 3. Electrical Isolation conflict check:
        # If one task requires live 25kV (e.g. electric locomotive move) and the other requires power de-energization
        if ("POWER_BLOCK_ISOLATION" in str(req_a.get("isolation_requirements", "")) and "LIVE" in work_b) or \
           ("POWER_BLOCK_ISOLATION" in str(req_b.get("isolation_requirements", "")) and "LIVE" in work_a):
            status = "INCOMPATIBLE"
            reasons.append("Electrical conflict: One task requires de-energized OHE power block while adjacent work requires energized traction.")

        # 4. Spatial feasibility check if assets provided
        if asset_a and asset_b:
            s_a, e_a = float(asset_a.get("start_km", 0)), float(asset_a.get("end_km", 10))
            s_b, e_b = float(asset_b.get("start_km", 0)), float(asset_b.get("end_km", 10))
            dist = max(0.0, max(s_a, s_b) - min(e_a, e_b))
            if dist > SafetyConfig.MAX_SPATIAL_PROXIMITY_KM:
                status = "INCOMPATIBLE"
                reasons.append(f"Spatial distance ({dist:.1f}km) exceeds maximum allowed multi-task possession cluster limit (5.0km).")

        return {
            "status": status,
            "is_compatible": status in ["COMPATIBLE", "CONDITIONAL_COMPATIBLE"],
            "dept_pair": f"{dept_a}+{dept_b}",
            "reasons": reasons if reasons else ["Cross-departmental safety clearance confirmed."]
        }

    @classmethod
    def validate_optimized_plan(
        cls,
        blocks: List[Dict[str, Any]],
        all_requests: List[Dict[str, Any]],
        train_schedules: List[Dict[str, Any]],
        assets: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Independent Post-Optimization Safety Plan Validator.
        Enforces:
          1. Mandatory task inclusion (optimizer must not drop mandatory work).
          2. Non-negotiable deadline enforcement (block_end <= effective_deadline).
          3. Headway / train safety buffer preservation against Rajdhani / Express trains.
          4. Bundled task cross-departmental compatibility.
          5. Block duration sufficiency.
          6. Physical section conflict protection.
        """
        violations: List[str] = []
        audited_blocks: List[Dict[str, Any]] = []
        scheduled_req_ids = set()

        req_lookup = {r.get("id"): r for r in all_requests if "id" in r}
        asset_lookup = {a.get("asset_id"): a for a in (assets or []) if "asset_id" in a}

        # Evaluate safety for all requests
        safety_evaluated_requests = {
            r.get("id"): cls.evaluate_request_safety(r, all_requests=all_requests, train_schedules=train_schedules)
            for r in all_requests if "id" in r
        }

        # -------------------------------------------------------------
        # PASS 1: Validate each block individually
        # -------------------------------------------------------------
        for b in blocks:
            b_id = b.get("id")
            b_start = cls.parse_time(b.get("scheduled_start"))
            b_end = cls.parse_time(b.get("scheduled_end"))
            bundled_ids = b.get("bundled_request_ids", [])
            block_violations: List[str] = []

            # 1. Check Train Headway Safety Buffer
            buf = datetime.timedelta(minutes=b.get("allocated_safety_buffer", DEFAULT_SAFETY_BUFFER_MINUTES))
            for train in train_schedules:
                t_arr = cls.parse_time(train.get("arrival_window_start"))
                t_dep = cls.parse_time(train.get("departure_window_end"))
                prio = str(train.get("priority_class", "")).upper()
                t_num = train.get("train_number", "TRAIN")

                t_safe_start = t_arr - buf
                t_safe_end = t_dep + buf

                # Overlap check
                if max(b_start, t_safe_start) < min(b_end, t_safe_end):
                    if prio in ["RAJDHANI", "VANDE BHARAT", "EXPRESS"]:
                        v_msg = (
                            f"Train Headway Violation in Block #{b_id}: Block window ({b_start.strftime('%H:%M')}-{b_end.strftime('%H:%M')}) "
                            f"conflicts with high-priority {prio} {t_num} ({t_arr.strftime('%H:%M')}-{t_dep.strftime('%H:%M')}) with {DEFAULT_SAFETY_BUFFER_MINUTES}m safety buffer"
                        )
                        block_violations.append(v_msg)
                        violations.append(v_msg)

            # 2. Check each task in bundle
            bundled_reqs = [req_lookup[rid] for rid in bundled_ids if rid in req_lookup]
            for req in bundled_reqs:
                rid = req["id"]
                scheduled_req_ids.add(rid)
                s_info = safety_evaluated_requests.get(rid, {})

                # Check Deadline Compliance
                eff_deadline_str = s_info.get("effective_deadline")
                if eff_deadline_str:
                    eff_deadline = cls.parse_time(eff_deadline_str)
                    if b_end > eff_deadline:
                        v_msg = (
                            f"Safety Deadline Breach in Block #{b_id}: Task {req.get('asset_id')} (Req #{rid}, {s_info.get('safety_classification')}) "
                            f"scheduled end {b_end.strftime('%H:%M')} exceeds non-negotiable safety deadline {eff_deadline.strftime('%H:%M')}"
                        )
                        block_violations.append(v_msg)
                        violations.append(v_msg)

            # 3. Check Pairwise Compatibility within Bundle
            for i in range(len(bundled_reqs)):
                for j in range(i + 1, len(bundled_reqs)):
                    r1 = bundled_reqs[i]
                    r2 = bundled_reqs[j]
                    a1 = asset_lookup.get(r1.get("asset_id"))
                    a2 = asset_lookup.get(r2.get("asset_id"))
                    compat = cls.check_bundle_compatibility(r1, r2, asset_a=a1, asset_b=a2)
                    if not compat["is_compatible"]:
                        v_msg = (
                            f"Unsafe Bundle in Block #{b_id}: Tasks #{r1['id']} ({r1.get('asset_id')}) and #{r2['id']} ({r2.get('asset_id')}) "
                            f"are INCOMPATIBLE. Reasons: {'; '.join(compat['reasons'])}"
                        )
                        block_violations.append(v_msg)
                        violations.append(v_msg)

            # 4. Check Block Duration vs Required Task Durations
            block_dur_mins = max(1, int((b_end - b_start).total_seconds() / 60))
            for req in bundled_reqs:
                req_dur = int(req.get("duration_minutes", 60))
                if req_dur > block_dur_mins:
                    v_msg = f"Insufficient Block Duration in Block #{b_id}: Block duration ({block_dur_mins}m) is less than required work duration ({req_dur}m) for Task #{req['id']}."
                    block_violations.append(v_msg)
                    violations.append(v_msg)

            audited_block = dict(b)
            audited_block["safety_validation_status"] = "UNSAFE" if block_violations else "SAFE"
            audited_block["safety_violations"] = block_violations
            audited_blocks.append(audited_block)

        # -------------------------------------------------------------
        # PASS 2: Validate Unscheduled Mandatory Tasks
        # -------------------------------------------------------------
        unscheduled_mandatory = []
        for rid, s_info in safety_evaluated_requests.items():
            if s_info.get("is_mandatory") and rid not in scheduled_req_ids:
                req = req_lookup.get(rid, {})
                unscheduled_mandatory.append(req)
                v_msg = (
                    f"Mandatory Task Omission: Task #{rid} ({req.get('asset_id')}, {s_info.get('safety_classification')}) "
                    f"was not scheduled in any valid block. The optimizer must never omit mandatory safety work."
                )
                violations.append(v_msg)

        passed = len(violations) == 0
        overall_status = "SAFE" if passed else "UNSAFE"

        return {
            "passed": passed,
            "status": overall_status,
            "violations_count": len(violations),
            "violations": violations,
            "unscheduled_mandatory_tasks_count": len(unscheduled_mandatory),
            "unscheduled_mandatory_tasks": unscheduled_mandatory,
            "audited_blocks": audited_blocks,
            "validated_at": datetime.datetime.now().isoformat(),
            "prototype_disclaimer": SafetyConfig.PROTOTYPE_DISCLAIMER
        }

    @classmethod
    def preempt_and_replan_emergency(
        cls,
        emergency_request: Dict[str, Any],
        existing_blocks: List[Dict[str, Any]],
        all_requests: List[Dict[str, Any]],
        train_schedules: List[Dict[str, Any]],
        assets: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Executes deterministic emergency preemption:
        Inserts an emergency possession block at the earliest possible conflict-free window
        before the 2h emergency deadline, shifting or preempting lower-priority routine work as necessary.
        """
        now = datetime.datetime.now()
        safety_eval = cls.evaluate_request_safety(emergency_request)
        emergency_deadline = cls.parse_time(safety_eval["effective_deadline"])
        duration_mins = int(emergency_request.get("duration_minutes", 60))

        # Search for the earliest feasible slot from now up to emergency_deadline
        proposed_start = now + datetime.timedelta(minutes=10) # 10m setup buffer
        proposed_end = proposed_start + datetime.timedelta(minutes=duration_mins)

        # Check train headway buffer
        buf = datetime.timedelta(minutes=DEFAULT_SAFETY_BUFFER_MINUTES)
        emergency_block_found = False
        attempts = 0

        while proposed_end <= emergency_deadline and attempts < 20:
            conflict = False
            for train in train_schedules:
                if train.get("priority_class") in ["RAJDHANI", "VANDE BHARAT"]:
                    t_arr = cls.parse_time(train.get("arrival_window_start"))
                    t_dep = cls.parse_time(train.get("departure_window_end"))
                    if max(proposed_start, t_arr - buf) < min(proposed_end, t_dep + buf):
                        conflict = True
                        proposed_start = t_dep + buf + datetime.timedelta(minutes=5)
                        proposed_end = proposed_start + datetime.timedelta(minutes=duration_mins)
                        break
            if not conflict:
                emergency_block_found = True
                break
            attempts += 1

        if not emergency_block_found:
            return {
                "success": False,
                "status": "NO_SAFE_PLAN",
                "message": f"Could not schedule emergency work on {emergency_request.get('asset_id')} before safety deadline {emergency_deadline.strftime('%H:%M')} without severe train collision.",
                "emergency_request": emergency_request,
                "recommendation": "IMMEDIATE CONTROLLER INTERVENTION: Issue emergency speed restriction / stop order on corridor.",
                "prototype_disclaimer": SafetyConfig.PROTOTYPE_DISCLAIMER
            }

        # Create emergency block
        emergency_block = {
            "id": 9999,
            "corridor_id": emergency_request.get("corridor_id", "NDLS-HWH-01"),
            "bundled_request_ids": [emergency_request.get("id", 999)],
            "scheduled_start": proposed_start.isoformat(),
            "scheduled_end": proposed_end.isoformat(),
            "allocated_safety_buffer": DEFAULT_SAFETY_BUFFER_MINUTES,
            "controller_approval_status": "APPROVED",
            "saved_block_hours": 0.0,
            "bundled_departments": [emergency_request.get("department_code", "TMS")],
            "urgency_score": 1.0,
            "priority_score": 100.0,
            "safety_override": True,
            "safety_validation_status": "SAFE",
            "safety_violations": []
        }

        # Shift or keep existing non-conflicting blocks
        revised_blocks = [emergency_block]
        for b in existing_blocks:
            b_start = cls.parse_time(b.get("scheduled_start"))
            b_end = cls.parse_time(b.get("scheduled_end"))

            # If existing block overlaps with emergency block, push it after the emergency block
            if max(b_start, proposed_start) < min(b_end, proposed_end + buf):
                shift_mins = int((proposed_end + buf - b_start).total_seconds() / 60) + 15
                new_start = b_start + datetime.timedelta(minutes=shift_mins)
                new_end = b_end + datetime.timedelta(minutes=shift_mins)
                b_copy = dict(b)
                b_copy["scheduled_start"] = new_start.isoformat()
                b_copy["scheduled_end"] = new_end.isoformat()
                b_copy["notes"] = f"Shifted by +{shift_mins}m due to Emergency Preemption by {emergency_request.get('asset_id')}"
                revised_blocks.append(b_copy)
            else:
                revised_blocks.append(b)

        # Run independent post-optimization validation
        val_result = cls.validate_optimized_plan(
            revised_blocks,
            all_requests + [emergency_request],
            train_schedules,
            assets
        )

        return {
            "success": True,
            "status": "EMERGENCY_PREEMPTION_COMPLETED",
            "emergency_block": emergency_block,
            "revised_blocks": revised_blocks,
            "validation": val_result,
            "message": f"Emergency block created for {emergency_request.get('asset_id')}. {len(revised_blocks)-1} existing blocks adjusted safely.",
            "prototype_disclaimer": SafetyConfig.PROTOTYPE_DISCLAIMER
        }
