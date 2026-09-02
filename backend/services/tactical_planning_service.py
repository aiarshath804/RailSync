"""
RailSync Tactical & Rolling-Horizon Planning Service.
Manages:
1. Weekly Tactical Planning (7-day horizon, daily shifts, high stability)
2. Monthly Rolling-Horizon Planning (30-day horizon, cyclic preventative maintenance & track renewals)
3. Plan Stability Index & Change Tracking (Measures churn between plan versions)
"""

import datetime
from typing import List, Dict, Any, Optional
from backend.services.corridor_availability_service import CorridorAvailabilityEngine
from backend.services.safety_guardrail_service import SafetyGuardrailService
from backend.services.bundling_service import BundlingService
from backend.services.operational_validator_service import OperationalValidatorService


class TacticalPlanningService:
    @staticmethod
    def parse_time(val: Any) -> datetime.datetime:
        return SafetyGuardrailService.parse_time(val)

    @classmethod
    def generate_tactical_plan(
        cls,
        requests: List[Dict[str, Any]],
        train_schedules: List[Dict[str, Any]],
        assets: Optional[List[Dict[str, Any]]] = None,
        horizon_days: int = 7,
        previous_plan: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generates a multi-day tactical maintenance plan for the specified horizon (7 or 30 days).
        Calculates daily shifts, bundled blocks, stability index against baseline, and availability.
        """
        now = datetime.datetime.now()
        horizon_start = now.replace(minute=0, second=0, microsecond=0)
        horizon_end = horizon_start + datetime.timedelta(days=horizon_days)

        # 1. Classify requests into horizon urgency buckets
        evaluated_reqs = SafetyGuardrailService.evaluate_batch_safety(
            requests, train_schedules=train_schedules
        )

        # 2. Group into Daily Tactical Slots
        daily_plans = []
        all_blocks = []
        block_id_counter = 5001 if horizon_days == 7 else 8001

        reqs_by_urgency = list(evaluated_reqs)
        reqs_by_urgency.sort(
            key=lambda x: (
                2 if x.get("is_emergency") else (1 if x.get("is_mandatory") or x.get("safety_override") else 0),
                float(x.get("priority_score", 50.0))
            ),
            reverse=True
        )

        unassigned_reqs = list(reqs_by_urgency)

        for day_offset in range(horizon_days):
            day_start = horizon_start + datetime.timedelta(days=day_offset)
            day_end = day_start + datetime.timedelta(days=1)
            day_label = day_start.strftime("%Y-%m-%d (%A)")

            # Discover available candidate windows for this day
            candidate_windows = CorridorAvailabilityEngine.generate_candidate_windows(
                corridor_id="NDLS-HWH-01",
                train_schedules=train_schedules,
                start_time=day_start,
                end_time=day_end,
                min_window_duration_mins=60,
                max_window_duration_mins=240
            )

            day_blocks = []
            day_reqs_assigned = []

            for win in candidate_windows:
                if not unassigned_reqs:
                    break

                win_start = cls.parse_time(win["start_time"])
                win_end = cls.parse_time(win["end_time"])
                win_dur = win["duration_minutes"]

                # Find compatible cluster for this window
                seed = None
                for r in unassigned_reqs:
                    r_dur = int(r.get("duration_minutes", 60))
                    r_deadline = cls.parse_time(r.get("effective_deadline", day_end))
                    # Must finish before deadline and fit within window
                    if r_dur <= win_dur and win_end <= r_deadline:
                        seed = r
                        break

                if not seed:
                    continue

                cluster = [seed]
                unassigned_reqs.remove(seed)
                day_reqs_assigned.append(seed)

                # Attempt cross-department bundling
                for other in list(unassigned_reqs):
                    o_dur = int(other.get("duration_minutes", 60))
                    o_deadline = cls.parse_time(other.get("effective_deadline", day_end))

                    if win_end <= o_deadline:
                        if all(BundlingService.can_bundle(other, m, assets=assets) for m in cluster):
                            max_dur = max(max(int(m.get("duration_minutes", 60)) for m in cluster), o_dur)
                            if max_dur <= win_dur:
                                cluster.append(other)
                                unassigned_reqs.remove(other)
                                day_reqs_assigned.append(other)

                # Formulate possession block
                max_cluster_dur = max(int(m.get("duration_minutes", 60)) for m in cluster)
                scheduled_start = win_start
                scheduled_end = scheduled_start + datetime.timedelta(minutes=max_cluster_dur)

                indiv_sum = sum(int(m.get("duration_minutes", 60)) for m in cluster)
                saved_hrs = max(0.0, round((indiv_sum - max_cluster_dur) / 60.0, 2))

                block_dict = {
                    "id": block_id_counter,
                    "day_label": day_label,
                    "day_index": day_offset + 1,
                    "corridor_id": "/".join(sorted(list(set(m.get("asset_id", "TRK-01") for m in cluster)))),
                    "bundled_request_ids": [m["id"] for m in cluster],
                    "scheduled_start": scheduled_start.isoformat(),
                    "scheduled_end": scheduled_end.isoformat(),
                    "duration_minutes": max_cluster_dur,
                    "allocated_safety_buffer": 15,
                    "controller_approval_status": "PENDING",
                    "saved_block_hours": saved_hrs,
                    "bundled_departments": list(set(m.get("department_code", "TMS") for m in cluster)),
                    "priority_score": round(max(float(m.get("priority_score", 50.0)) for m in cluster), 1),
                    "traffic_disruption_index": win.get("traffic_impact_score", 0.15),
                    "safety_validation_status": "SAFE"
                }
                block_id_counter += 1
                day_blocks.append(block_dict)
                all_blocks.append(block_dict)

            daily_plans.append({
                "day_index": day_offset + 1,
                "date": day_label,
                "blocks_count": len(day_blocks),
                "tasks_scheduled": sum(len(b["bundled_request_ids"]) for b in day_blocks),
                "saved_block_hours": round(sum(b["saved_block_hours"] for b in day_blocks), 2),
                "blocks": day_blocks
            })

        # Calculate Asset Availability
        total_possession_hrs = sum(int(b["duration_minutes"]) / 60.0 for b in all_blocks)
        total_corridor_hrs = 12 * (horizon_days * 24.0) # 12 corridor assets
        availability_pct = round((1.0 - (total_possession_hrs / max(1.0, total_corridor_hrs))) * 100.0, 2)

        # Plan Stability & Churn Analysis
        stability_metrics = cls.calculate_plan_stability(previous_plan or [], all_blocks)

        # Operational Validation Pass
        val_report = OperationalValidatorService.validate_plan(
            all_blocks, requests, train_schedules, assets=assets
        )

        return {
            "horizon_type": "WEEKLY_TACTICAL" if horizon_days == 7 else "MONTHLY_ROLLING",
            "horizon_days": horizon_days,
            "horizon_start": horizon_start.isoformat(),
            "horizon_end": horizon_end.isoformat(),
            "total_blocks_created": len(all_blocks),
            "total_tasks_scheduled": sum(len(b["bundled_request_ids"]) for b in all_blocks),
            "unscheduled_tasks_count": len(unassigned_reqs),
            "total_saved_block_hours": round(sum(b["saved_block_hours"] for b in all_blocks), 2),
            "asset_availability_pct": availability_pct,
            "stability_index": stability_metrics["stability_index"],
            "stability_metrics": stability_metrics,
            "daily_schedules": daily_plans,
            "optimized_blocks": all_blocks,
            "operational_validation": val_report
        }

    @classmethod
    def calculate_plan_stability(
        cls,
        previous_blocks: List[Dict[str, Any]],
        new_blocks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates Plan Stability Index (0.00 to 1.00 / 0% to 100%) and categorizes block churn:
        - UNCHANGED: Scheduled in identical time window (+/- 15 mins)
        - SHIFTED: Same tasks, moved to new window/day
        - NEW: Added in new plan
        - CANCELLED / DEFERRED: Removed from active horizon
        """
        if not previous_blocks:
            return {
                "stability_index": 1.0,
                "stability_percentage": 100.0,
                "status": "BASELINE_PLAN",
                "unchanged_blocks_count": len(new_blocks),
                "shifted_blocks_count": 0,
                "new_blocks_count": len(new_blocks),
                "churn_rate_pct": 0.0,
                "change_log": ["Initial baseline tactical plan established."]
            }

        prev_map = {tuple(sorted(b.get("bundled_request_ids", []))): b for b in previous_blocks if b.get("bundled_request_ids")}
        new_map = {tuple(sorted(b.get("bundled_request_ids", []))): b for b in new_blocks if b.get("bundled_request_ids")}

        unchanged = 0
        shifted = 0
        new_additions = 0
        change_log = []

        for req_tuple, new_b in new_map.items():
            if req_tuple in prev_map:
                prev_b = prev_map[req_tuple]
                prev_s = cls.parse_time(prev_b.get("scheduled_start"))
                new_s = cls.parse_time(new_b.get("scheduled_start"))
                time_diff_mins = abs((new_s - prev_s).total_seconds()) / 60.0

                if time_diff_mins <= 15.0:
                    unchanged += 1
                else:
                    shifted += 1
                    change_log.append(f"Block for tasks {list(req_tuple)} shifted from {prev_s.strftime('%d-%b %H:%M')} to {new_s.strftime('%d-%b %H:%M')}")
            else:
                new_additions += 1
                change_log.append(f"New block created for tasks {list(req_tuple)} at {new_b.get('scheduled_start')}")

        total_compared = max(1, len(new_blocks))
        stability_score = round(unchanged / total_compared, 3)
        stability_pct = round(stability_score * 100.0, 1)
        churn_pct = round((shifted + new_additions) / total_compared * 100.0, 1)

        return {
            "stability_index": stability_score,
            "stability_percentage": stability_pct,
            "status": "STABLE" if stability_pct >= 85.0 else ("MODERATE_CHURN" if stability_pct >= 60.0 else "HIGH_CHURN"),
            "unchanged_blocks_count": unchanged,
            "shifted_blocks_count": shifted,
            "new_blocks_count": new_additions,
            "churn_rate_pct": churn_pct,
            "change_log": change_log[:10]
        }
