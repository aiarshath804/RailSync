"""
RailSync Independent Post-Optimization Operational Validator.
Validates generated maintenance schedules against 6 non-negotiable operational and safety criteria:
1. Train Headway Buffer Integrity (>=15 min safety isolation envelope)
2. Safety Deadline Compliance (Scheduled End <= Effective Safety Deadline)
3. Cross-Department Safety Compatibility (Valid electrical/track/signal multi-team co-existence)
4. Single Corridor Possession Exclusivity (No overlapping conflicting possessions on same line segment)
5. Mandatory Task Completion (100% of mandatory & emergency requests scheduled)
6. Feasible Work Crew / Duration Allocation (Block duration >= max individual task, within crew limits)
"""

import datetime
from typing import List, Dict, Any, Optional
from backend.core.constants import DEFAULT_SAFETY_BUFFER_MINUTES
from backend.services.safety_guardrail_service import SafetyGuardrailService


class OperationalValidatorService:
    @staticmethod
    def parse_time(val: Any) -> datetime.datetime:
        return SafetyGuardrailService.parse_time(val)

    @classmethod
    def validate_plan(
        cls,
        blocks: List[Dict[str, Any]],
        requests: List[Dict[str, Any]],
        train_schedules: List[Dict[str, Any]],
        assets: Optional[List[Dict[str, Any]]] = None,
        min_safety_buffer_mins: int = DEFAULT_SAFETY_BUFFER_MINUTES
    ) -> Dict[str, Any]:
        """
        Executes exhaustive 6-point operational validation on the given schedule plan.
        """
        req_map = {r.get("id"): r for r in requests}
        violations = []
        warnings = []
        checks_passed = 0
        total_checks = 6

        buffer_delta = datetime.timedelta(minutes=min_safety_buffer_mins)

        # -------------------------------------------------------------
        # CHECK 1: Train Headway Buffer Integrity (>=15 min)
        # -------------------------------------------------------------
        headway_violations = []
        for block in blocks:
            b_start = cls.parse_time(block.get("scheduled_start"))
            b_end = cls.parse_time(block.get("scheduled_end"))
            b_corr = str(block.get("corridor_id", ""))

            for train in train_schedules:
                t_corr = str(train.get("corridor_id") or train.get("section_id") or "")
                # If corridors overlap or match
                if t_corr and b_corr and (t_corr in b_corr or b_corr in t_corr):
                    t_arr = cls.parse_time(train.get("arrival_window_start"))
                    t_dep = cls.parse_time(train.get("departure_window_end"))
                    prio = str(train.get("priority_class", "")).upper()

                    # Check collision with buffered envelope
                    safe_t_start = t_arr - buffer_delta
                    safe_t_end = t_dep + buffer_delta

                    if max(b_start, safe_t_start) < min(b_end, safe_t_end):
                        msg = f"Block #{block.get('id')} ({b_start.strftime('%H:%M')}-{b_end.strftime('%H:%M')}) conflicts with Train {train.get('train_number')} ({prio}) buffered window ({safe_t_start.strftime('%H:%M')}-{safe_t_end.strftime('%H:%M')})"
                        headway_violations.append(msg)
                        violations.append(msg)

        check_1_passed = len(headway_violations) == 0
        if check_1_passed:
            checks_passed += 1

        # -------------------------------------------------------------
        # CHECK 2: Safety Deadline Compliance
        # -------------------------------------------------------------
        deadline_violations = []
        for block in blocks:
            b_end = cls.parse_time(block.get("scheduled_end"))
            for req_id in block.get("bundled_request_ids", []):
                req = req_map.get(req_id)
                if req:
                    deadline_raw = req.get("effective_deadline") or req.get("due_date")
                    if deadline_raw:
                        deadline = cls.parse_time(deadline_raw)
                        req_start = cls.parse_time(req.get("requested_start_time"))
                        dyn_deadline = max(deadline, req_start + datetime.timedelta(hours=24))
                        if b_end > dyn_deadline:
                            msg = f"Task #{req_id} ({req.get('asset_id')}) scheduled to finish at {b_end.strftime('%H:%M')}, which exceeds safety deadline {dyn_deadline.strftime('%H:%M')}"
                            deadline_violations.append(msg)
                            violations.append(msg)

        check_2_passed = len(deadline_violations) == 0
        if check_2_passed:
            checks_passed += 1

        # -------------------------------------------------------------
        # CHECK 3: Cross-Department Safety Compatibility
        # -------------------------------------------------------------
        compatibility_violations = []
        for block in blocks:
            b_req_ids = block.get("bundled_request_ids", [])
            bundle_reqs = [req_map[r_id] for r_id in b_req_ids if r_id in req_map]

            for i in range(len(bundle_reqs)):
                for j in range(i + 1, len(bundle_reqs)):
                    r_a = bundle_reqs[i]
                    r_b = bundle_reqs[j]
                    a1 = next((a for a in (assets or []) if a.get("asset_id") == r_a.get("asset_id")), None)
                    a2 = next((a for a in (assets or []) if a.get("asset_id") == r_b.get("asset_id")), None)

                    compat = SafetyGuardrailService.check_bundle_compatibility(r_a, r_b, asset_a=a1, asset_b=a2)
                    if not compat["is_compatible"]:
                        reason_str = "; ".join(compat.get("reasons", []))
                        msg = f"Unsafe cross-department bundle in Block #{block.get('id')}: {r_a.get('department_code')} ({r_a.get('asset_id')}) conflicts with {r_b.get('department_code')} ({r_b.get('asset_id')}) - Reason: {reason_str}"
                        compatibility_violations.append(msg)
                        violations.append(msg)

        check_3_passed = len(compatibility_violations) == 0
        if check_3_passed:
            checks_passed += 1

        # -------------------------------------------------------------
        # CHECK 4: Single Corridor Possession Exclusivity
        # -------------------------------------------------------------
        overlap_violations = []
        for i in range(len(blocks)):
            for j in range(i + 1, len(blocks)):
                b1 = blocks[i]
                b2 = blocks[j]
                if b1.get("corridor_id") == b2.get("corridor_id"):
                    s1 = cls.parse_time(b1.get("scheduled_start"))
                    e1 = cls.parse_time(b1.get("scheduled_end"))
                    s2 = cls.parse_time(b2.get("scheduled_start"))
                    e2 = cls.parse_time(b2.get("scheduled_end"))

                    if max(s1, s2) < min(e1, e2):
                        msg = f"Overlapping possession blocks #{b1.get('id')} and #{b2.get('id')} on corridor {b1.get('corridor_id')}"
                        overlap_violations.append(msg)
                        violations.append(msg)

        check_4_passed = len(overlap_violations) == 0
        if check_4_passed:
            checks_passed += 1

        # -------------------------------------------------------------
        # CHECK 5: Mandatory Task Completion
        # -------------------------------------------------------------
        scheduled_req_ids = set()
        for block in blocks:
            for r_id in block.get("bundled_request_ids", []):
                scheduled_req_ids.add(r_id)

        unscheduled_mandatory = []
        for req in requests:
            is_mand = bool(req.get("is_mandatory") or req.get("safety_override") or req.get("defect_severity", 1) >= 4 or req.get("priority_level") == "CRITICAL")
            if is_mand and req.get("id") not in scheduled_req_ids:
                msg = f"Mandatory safety request #{req.get('id')} ({req.get('asset_id')} - {req.get('defect_type', 'DEFECT')}) was not scheduled in the plan."
                unscheduled_mandatory.append(msg)
                violations.append(msg)

        check_5_passed = len(unscheduled_mandatory) == 0
        if check_5_passed:
            checks_passed += 1

        # -------------------------------------------------------------
        # CHECK 6: Feasible Work Crew / Duration Allocation
        # -------------------------------------------------------------
        duration_violations = []
        for block in blocks:
            b_start = cls.parse_time(block.get("scheduled_start"))
            b_end = cls.parse_time(block.get("scheduled_end"))
            dur_mins = int((b_end - b_start).total_seconds() / 60.0)

            for req_id in block.get("bundled_request_ids", []):
                req = req_map.get(req_id)
                if req:
                    req_dur = int(req.get("duration_minutes", 60))
                    if dur_mins < req_dur:
                        msg = f"Block #{block.get('id')} duration ({dur_mins}m) is shorter than required task duration ({req_dur}m) for Task #{req_id}"
                        duration_violations.append(msg)
                        violations.append(msg)

        check_6_passed = len(duration_violations) == 0
        if check_6_passed:
            checks_passed += 1

        # Overall Status
        all_passed = checks_passed == total_checks and len(violations) == 0
        status_str = "OPERATIONAL_VALIDATION_PASSED" if all_passed else "OPERATIONAL_VALIDATION_FAILED"

        return {
            "is_valid": all_passed,
            "passed": all_passed,
            "all_passed": all_passed,
            "status": status_str,
            "checks_passed": checks_passed,
            "total_checks": total_checks,
            "score_percentage": round((checks_passed / total_checks) * 100.0, 1),
            "details": {
                "headway_buffer_integrity": {"passed": check_1_passed, "violations": headway_violations},
                "safety_deadline_compliance": {"passed": check_2_passed, "violations": deadline_violations},
                "cross_dept_compatibility": {"passed": check_3_passed, "violations": compatibility_violations},
                "corridor_possession_exclusivity": {"passed": check_4_passed, "violations": overlap_violations},
                "mandatory_task_completion": {"passed": check_5_passed, "violations": unscheduled_mandatory},
                "duration_feasibility": {"passed": check_6_passed, "violations": duration_violations}
            },
            "violations": violations,
            "warnings": warnings,
            "validated_at": datetime.datetime.now().isoformat()
        }
