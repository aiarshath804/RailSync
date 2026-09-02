"""
RailSync Dynamic Corridor Availability Engine.
Computes train occupancy timelines from COA / timetable data, evaluates headway isolation buffers,
generates candidate block windows from occupancy gaps, and calculates explainable traffic impact scores.
"""

import datetime
from typing import List, Dict, Any, Tuple, Optional
from backend.core.constants import DEFAULT_SAFETY_BUFFER_MINUTES, TrainPriorityEnum
from backend.services.safety_guardrail_service import SafetyGuardrailService


class CorridorAvailabilityEngine:
    @staticmethod
    def parse_time(val: Any) -> datetime.datetime:
        return SafetyGuardrailService.parse_time(val)

    @classmethod
    def get_corridor_occupancy_timeline(
        cls,
        corridor_id: str,
        train_schedules: List[Dict[str, Any]],
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        safety_buffer_mins: int = DEFAULT_SAFETY_BUFFER_MINUTES
    ) -> List[Dict[str, Any]]:
        """
        Extracts all train occupancy intervals on the specified corridor with safety buffers.
        """
        buffer_delta = datetime.timedelta(minutes=safety_buffer_mins)
        occupancies = []

        for train in train_schedules:
            c_id = train.get("corridor_id") or train.get("section_id") or "NDLS-HWH-01"
            if c_id != corridor_id and corridor_id != "ALL":
                continue

            t_arr = cls.parse_time(train.get("arrival_window_start"))
            t_dep = cls.parse_time(train.get("departure_window_end"))
            prio = str(train.get("priority_class", "EXPRESS")).upper()
            train_no = str(train.get("train_number") or train.get("train_id", "TRAIN"))
            train_name = str(train.get("name", f"Train {train_no}"))

            # Effective occupancy interval with safety isolation buffer
            occ_start = t_arr - buffer_delta
            occ_end = t_dep + buffer_delta

            if occ_end >= start_time and occ_start <= end_time:
                occupancies.append({
                    "train_number": train_no,
                    "train_name": train_name,
                    "priority_class": prio,
                    "arrival_window_start": t_arr.isoformat(),
                    "departure_window_end": t_dep.isoformat(),
                    "buffered_start": occ_start.isoformat(),
                    "buffered_end": occ_end.isoformat(),
                    "raw_start": t_arr,
                    "raw_end": t_dep,
                    "safe_start": occ_start,
                    "safe_end": occ_end,
                    "corridor_id": c_id
                })

        occupancies.sort(key=lambda x: x["safe_start"])
        return occupancies

    @classmethod
    def generate_candidate_windows(
        cls,
        corridor_id: str,
        train_schedules: List[Dict[str, Any]],
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        min_window_duration_mins: int = 60,
        max_window_duration_mins: int = 360,
        safety_buffer_mins: int = DEFAULT_SAFETY_BUFFER_MINUTES
    ) -> List[Dict[str, Any]]:
        """
        Discovers and generates all viable candidate block windows from actual occupancy gaps.
        Scores each candidate window for traffic impact, duration fit, and passenger disruption.
        """
        occupancies = cls.get_corridor_occupancy_timeline(
            corridor_id=corridor_id,
            train_schedules=train_schedules,
            start_time=start_time,
            end_time=end_time,
            safety_buffer_mins=safety_buffer_mins
        )

        candidate_windows = []
        current_time = start_time

        # Merge overlapping or contiguous train occupancy blocks
        merged_intervals: List[Tuple[datetime.datetime, datetime.datetime, List[Dict[str, Any]]]] = []
        for occ in occupancies:
            s, e = occ["safe_start"], occ["safe_end"]
            if not merged_intervals:
                merged_intervals.append((s, e, [occ]))
            else:
                last_s, last_e, last_trains = merged_intervals[-1]
                if s <= last_e:
                    # Overlap or contiguous
                    new_e = max(last_e, e)
                    merged_intervals[-1] = (last_s, new_e, last_trains + [occ])
                else:
                    merged_intervals.append((s, e, [occ]))

        # Find gaps between merged train intervals
        gap_id = 1
        for m_start, m_end, trains_in_block in merged_intervals:
            if m_start > current_time:
                gap_duration = int((m_start - current_time).total_seconds() / 60.0)
                if gap_duration >= min_window_duration_mins:
                    w_start = current_time
                    w_end = min(m_start, current_time + datetime.timedelta(minutes=min(gap_duration, max_window_duration_mins)))
                    actual_duration = int((w_end - w_start).total_seconds() / 60.0)

                    impact_analysis = cls.calculate_traffic_impact(
                        w_start, w_end, train_schedules, corridor_id
                    )

                    candidate_windows.append({
                        "window_id": f"WIN-{corridor_id[:4]}-{gap_id:03d}",
                        "corridor_id": corridor_id,
                        "start_time": w_start.isoformat(),
                        "end_time": w_end.isoformat(),
                        "duration_minutes": actual_duration,
                        "available_gap_minutes": gap_duration,
                        "traffic_impact_score": impact_analysis["impact_score"],
                        "traffic_density_level": impact_analysis["traffic_density_level"],
                        "passenger_disruption_index": impact_analysis["passenger_disruption_index"],
                        "suitability_rank": impact_analysis["suitability_rank"],
                        "explanation": impact_analysis["explanation"],
                        "adjacent_train_before": impact_analysis.get("adjacent_train_before"),
                        "adjacent_train_after": impact_analysis.get("adjacent_train_after"),
                        "is_off_peak": impact_analysis["is_off_peak"],
                        "safety_buffer_mins": safety_buffer_mins
                    })
                    gap_id += 1
            current_time = max(current_time, m_end)

        # Gap after the last train interval
        if current_time < end_time:
            gap_duration = int((end_time - current_time).total_seconds() / 60.0)
            if gap_duration >= min_window_duration_mins:
                w_start = current_time
                w_end = min(end_time, current_time + datetime.timedelta(minutes=min(gap_duration, max_window_duration_mins)))
                actual_duration = int((w_end - w_start).total_seconds() / 60.0)

                impact_analysis = cls.calculate_traffic_impact(
                    w_start, w_end, train_schedules, corridor_id
                )

                candidate_windows.append({
                    "window_id": f"WIN-{corridor_id[:4]}-{gap_id:03d}",
                    "corridor_id": corridor_id,
                    "start_time": w_start.isoformat(),
                    "end_time": w_end.isoformat(),
                    "duration_minutes": actual_duration,
                    "available_gap_minutes": gap_duration,
                    "traffic_impact_score": impact_analysis["impact_score"],
                    "traffic_density_level": impact_analysis["traffic_density_level"],
                    "passenger_disruption_index": impact_analysis["passenger_disruption_index"],
                    "suitability_rank": impact_analysis["suitability_rank"],
                    "explanation": impact_analysis["explanation"],
                    "adjacent_train_before": impact_analysis.get("adjacent_train_before"),
                    "adjacent_train_after": impact_analysis.get("adjacent_train_after"),
                    "is_off_peak": impact_analysis["is_off_peak"],
                    "safety_buffer_mins": safety_buffer_mins
                })

        # Rank candidate windows (Lowest traffic impact + largest gap first)
        candidate_windows.sort(
            key=lambda w: (
                w["traffic_impact_score"],
                -w["duration_minutes"]
            )
        )

        for rank_idx, win in enumerate(candidate_windows, start=1):
            win["suitability_rank"] = rank_idx

        return candidate_windows

    @classmethod
    def calculate_traffic_impact(
        cls,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        train_schedules: List[Dict[str, Any]],
        corridor_id: str
    ) -> Dict[str, Any]:
        """
        Calculates explainable traffic impact score (0.00 to 1.00) for a prospective window.
        Takes into account:
        1. Time of day (Night 00:00-05:00 = lowest impact 0.05; Peak 07:00-11:00 / 17:00-21:00 = high 0.40)
        2. Proximity to Rajdhani / Vande Bharat (penalty up to 0.40)
        3. Proximity to Express / Mail (penalty up to 0.20)
        4. Buffer adequacy
        """
        hour = start_time.hour
        is_night = (0 <= hour < 5) or (23 <= hour <= 24)
        is_peak = (7 <= hour <= 11) or (17 <= hour <= 21)

        base_penalty = 0.05 if is_night else (0.35 if is_peak else 0.18)

        # Check adjacent trains within 60 minutes of window boundaries
        train_penalty = 0.0
        nearest_before = None
        nearest_after = None
        min_dist_before = 99999.0
        min_dist_after = 99999.0

        for train in train_schedules:
            c_id = train.get("corridor_id") or train.get("section_id") or "NDLS-HWH-01"
            if c_id != corridor_id and corridor_id != "ALL":
                continue

            t_arr = cls.parse_time(train.get("arrival_window_start"))
            t_dep = cls.parse_time(train.get("departure_window_end"))
            prio = str(train.get("priority_class", "EXPRESS")).upper()

            # Train before window
            if t_dep <= start_time:
                dist = (start_time - t_dep).total_seconds() / 60.0
                if dist < min_dist_before:
                    min_dist_before = dist
                    nearest_before = {
                        "train_number": str(train.get("train_number")),
                        "name": str(train.get("name")),
                        "priority": prio,
                        "margin_minutes": round(dist, 1)
                    }

            # Train after window
            if t_arr >= end_time:
                dist = (t_arr - end_time).total_seconds() / 60.0
                if dist < min_dist_after:
                    min_dist_after = dist
                    nearest_after = {
                        "train_number": str(train.get("train_number")),
                        "name": str(train.get("name")),
                        "priority": prio,
                        "margin_minutes": round(dist, 1)
                    }

        # Premium train margin penalties
        if nearest_before and nearest_before["margin_minutes"] < 30.0:
            if nearest_before["priority"] in ["RAJDHANI", "VANDE BHARAT"]:
                train_penalty += 0.25
            else:
                train_penalty += 0.10

        if nearest_after and nearest_after["margin_minutes"] < 30.0:
            if nearest_after["priority"] in ["RAJDHANI", "VANDE BHARAT"]:
                train_penalty += 0.25
            else:
                train_penalty += 0.10

        total_impact = round(min(1.0, max(0.02, base_penalty + train_penalty)), 2)

        density_level = "LOW" if total_impact <= 0.25 else ("MEDIUM" if total_impact <= 0.55 else "HIGH")
        passenger_disruption = round(total_impact * 0.9, 2)

        # Generate explainable justification
        time_desc = "Off-peak Night slot (00:00-05:00)" if is_night else ("Peak Passenger Corridor hours" if is_peak else "Mid-day operational window")
        conflict_desc = "Clear of premium passenger paths." if train_penalty == 0.0 else f"Near premium train {nearest_after['name'] if nearest_after else 'Express'} ({round(min(min_dist_before, min_dist_after))}m margin)."
        explanation = f"{time_desc}. Traffic disruption index: {total_impact:.2f} ({density_level}). {conflict_desc}"

        return {
            "impact_score": total_impact,
            "traffic_density_level": density_level,
            "passenger_disruption_index": passenger_disruption,
            "suitability_rank": 1,
            "explanation": explanation,
            "is_off_peak": is_night,
            "adjacent_train_before": nearest_before,
            "adjacent_train_after": nearest_after
        }

    @classmethod
    def calculate_corridor_asset_availability(
        cls,
        total_corridors: int,
        horizon_hours: float,
        total_possession_hours: float
    ) -> Dict[str, Any]:
        """
        RailSync Prototype Asset Availability Metric:
        Availability % = (1 - (Total Possession Hours / (Total Corridors * Horizon Hours))) * 100
        """
        max_corridor_hours = max(1.0, float(total_corridors) * float(horizon_hours))
        possession_pct = (min(max_corridor_hours, total_possession_hours) / max_corridor_hours) * 100.0
        availability_pct = max(0.0, round(100.0 - possession_pct, 2))

        return {
            "total_corridors": total_corridors,
            "horizon_hours": horizon_hours,
            "total_corridor_capacity_hours": max_corridor_hours,
            "total_possession_hours": round(total_possession_hours, 2),
            "possession_percentage": round(possession_pct, 2),
            "asset_availability_pct": availability_pct,
            "benchmark_rating": "EXCELLENT" if availability_pct >= 95.0 else ("GOOD" if availability_pct >= 90.0 else "SUB-OPTIMAL")
        }

    @classmethod
    def calculate_saved_block_hours(
        cls,
        bundled_blocks: List[Dict[str, Any]],
        requests_map: Dict[int, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Transparent Block-Hours Saved Calculation:
        Saved Hours = Sum(Individual Request Durations) - Actual Bundled Block Duration
        """
        total_individual_mins = 0
        total_bundled_mins = 0
        block_breakdowns = []

        for block in bundled_blocks:
            b_req_ids = block.get("bundled_request_ids", [])
            req_durations = []
            for r_id in b_req_ids:
                req = requests_map.get(r_id, {})
                dur = int(req.get("duration_minutes", 60))
                req_durations.append({"request_id": r_id, "duration_minutes": dur, "dept": req.get("department_code", "TMS")})
                total_individual_mins += dur

            b_start = cls.parse_time(block.get("scheduled_start"))
            b_end = cls.parse_time(block.get("scheduled_end"))
            actual_block_mins = max(1, int((b_end - b_start).total_seconds() / 60.0))
            total_bundled_mins += actual_block_mins

            indiv_sum_mins = sum(d["duration_minutes"] for d in req_durations)
            saved_mins = max(0, indiv_sum_mins - actual_block_mins)

            block_breakdowns.append({
                "block_id": block.get("id"),
                "corridor_id": block.get("corridor_id"),
                "tasks_count": len(b_req_ids),
                "individual_sum_hours": round(indiv_sum_mins / 60.0, 2),
                "actual_block_hours": round(actual_block_mins / 60.0, 2),
                "saved_block_hours": round(saved_mins / 60.0, 2),
                "tasks": req_durations
            })

        total_saved_hours = max(0.0, round((total_individual_mins - total_bundled_mins) / 60.0, 2))
        efficiency_gain_pct = round((total_saved_hours / max(1.0, total_individual_mins / 60.0)) * 100.0, 1) if total_individual_mins > 0 else 0.0

        return {
            "total_unbundled_hours": round(total_individual_mins / 60.0, 2),
            "total_bundled_block_hours": round(total_bundled_mins / 60.0, 2),
            "total_saved_block_hours": total_saved_hours,
            "efficiency_gain_percentage": efficiency_gain_pct,
            "blocks_analyzed": len(bundled_blocks),
            "breakdowns": block_breakdowns
        }
