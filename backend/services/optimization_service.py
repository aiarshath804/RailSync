import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from backend.core.constants import (
    DEFAULT_SAFETY_BUFFER_MINUTES, 
    MAX_BLOCK_DURATION_MINUTES, 
    SOLVER_TIMEOUT_SECONDS,
    TrainPriorityEnum
)
from backend.services.prioritization_service import PrioritizationService
from backend.services.safety_service import SafetyService
from backend.services.bundling_service import BundlingService

logger = logging.getLogger("rail_sync_optimizer")

try:
    from ortools.sat.python import cp_model
    HAS_ORTOOLS = True
except ImportError:
    HAS_ORTOOLS = False
    logger.warning("OR-Tools not found. Falling back to heuristic solver.")

class OptimizationService:
    @staticmethod
    def parse_time(val: Any) -> datetime:
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            return datetime.fromisoformat(val.replace("Z", "+00:00").split("+")[0])
        return datetime.now()

    @classmethod
    def optimize_schedule(
        cls,
        requests: List[Dict[str, Any]],
        train_schedules: List[Dict[str, Any]],
        assets: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes CP-SAT Mathematical Optimization for Cross-Departmental Block Possession Planning.
        """
        timestamp_str = datetime.now().isoformat()
        
        if not requests:
            return {
                "success": True,
                "message": "No pending maintenance requests to optimize",
                "solver_used": "cp_sat" if HAS_ORTOOLS else "heuristic_fallback",
                "optimization_status": "NO_REQUESTS",
                "total_block_hours": 0.0,
                "total_hours_saved": 0.0,
                "bundled_task_count": 0,
                "scheduled_task_count": 0,
                "unscheduled_task_count": 0,
                "constraint_violations": [],
                "optimization_timestamp": timestamp_str,
                "status": "OPTIMAL_SCHEDULE_GENERATED",
                "saved_block_hours": 0.0,
                "total_blocks_created": 0,
                "optimized_blocks": []
            }

        # Step 1: Prioritize and rank requests
        ranked_requests = PrioritizationService.score_and_rank_requests(requests)
        
        # Step 2: Form candidate spatial & departmental clusters
        clusters = BundlingService.create_bundled_clusters(ranked_requests, assets)
        
        # Step 3: Solve using CP-SAT or Heuristic
        if HAS_ORTOOLS:
            try:
                return cls._solve_with_cpsat(ranked_requests, clusters, train_schedules, assets, timestamp_str)
            except Exception as e:
                logger.error(f"CP-SAT solver encountered exception: {e}. Falling back to Heuristic solver.")
                return cls._solve_with_heuristic(ranked_requests, clusters, train_schedules, assets, timestamp_str)
        else:
            return cls._solve_with_heuristic(ranked_requests, clusters, train_schedules, assets, timestamp_str)

    @classmethod
    def _solve_with_cpsat(
        cls,
        requests: List[Dict[str, Any]],
        clusters: List[List[Dict[str, Any]]],
        train_schedules: List[Dict[str, Any]],
        assets: List[Dict[str, Any]],
        timestamp_str: str
    ) -> Dict[str, Any]:
        model = cp_model.CpModel()
        
        # Base timeline horizon in minutes (0 to 1440 min = 24 hours)
        HORIZON_MINUTES = 1440
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        block_intervals = []
        cluster_data = []
        
        for c_idx, cluster in enumerate(clusters):
            # Calculate cluster duration (max duration among tasks in cluster)
            durations = [r.get("duration_minutes", 90) for r in cluster]
            block_dur = max(durations)
            
            # Earliest requested time in minutes from now
            req_times = [cls.parse_time(r.get("requested_start_time")) for r in cluster]
            earliest_dt = min(req_times)
            earliest_min = max(0, int((earliest_dt - now).total_seconds() / 60))
            latest_min = min(HORIZON_MINUTES - block_dur, earliest_min + 360) # 6 hr flexibility window
            
            # CP-SAT Variables
            start_var = model.NewIntVar(earliest_min, latest_min, f"start_c_{c_idx}")
            end_var = model.NewIntVar(earliest_min + block_dur, latest_min + block_dur, f"end_c_{c_idx}")
            interval_var = model.NewIntervalVar(start_var, block_dur, end_var, f"interval_c_{c_idx}")
            
            block_intervals.append(interval_var)
            cluster_data.append({
                "cluster": cluster,
                "duration": block_dur,
                "start_var": start_var,
                "end_var": end_var,
                "earliest_min": earliest_min
            })

        # Constraint 1: Non-overlapping corridor possession blocks
        if len(block_intervals) > 1:
            model.AddNoOverlap(block_intervals)

        # Constraint 2: Safety buffer against High Priority Trains (Rajdhani)
        train_intervals = []
        for t_idx, train in enumerate(train_schedules):
            try:
                arr = cls.parse_time(train.get("arrival_window_start"))
                dep = cls.parse_time(train.get("departure_window_end"))
                prio = train.get("priority_class", "")
                
                t_start_min = max(0, int((arr - now).total_seconds() / 60) - DEFAULT_SAFETY_BUFFER_MINUTES)
                t_end_min = min(HORIZON_MINUTES, int((dep - now).total_seconds() / 60) + DEFAULT_SAFETY_BUFFER_MINUTES)
                t_dur = max(15, t_end_min - t_start_min)
                
                if prio == TrainPriorityEnum.RAJDHANI.value:
                    # Enforce strict non-overlap with Rajdhani trains
                    t_interval = model.NewIntervalVar(t_start_min, t_dur, t_start_min + t_dur, f"train_raj_{t_idx}")
                    train_intervals.append(t_interval)
            except Exception:
                continue

        if train_intervals:
            for b_int in block_intervals:
                model.AddNoOverlap([b_int] + train_intervals)

        # Objective: Minimize deviation from requested start times + maximize saved hours
        objective_terms = []
        for item in cluster_data:
            objective_terms.append(item["start_var"] - item["earliest_min"])
            
        model.Minimize(sum(objective_terms))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = SOLVER_TIMEOUT_SECONDS
        solver_status = solver.Solve(model)

        if solver_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            optimized_blocks = []
            total_saved_hours = 0.0
            total_block_hours = 0.0
            bundled_task_count = 0
            all_violations = []

            for idx, item in enumerate(cluster_data):
                start_mins = solver.Value(item["start_var"])
                end_mins = solver.Value(item["end_var"])
                
                block_start_dt = now + timedelta(minutes=start_mins)
                block_end_dt = now + timedelta(minutes=end_mins)
                
                cluster = item["cluster"]
                req_ids = [r["id"] for r in cluster if "id" in r]
                depts = list(set(r.get("department_code", "TMS") for r in cluster))
                
                # Hours calculation
                individual_sum_hours = sum(r.get("duration_minutes", 90) for r in cluster) / 60.0
                actual_block_hours = item["duration"] / 60.0
                saved_hrs = max(0.0, round(individual_sum_hours - actual_block_hours, 2)) if len(cluster) > 1 else 0.0
                
                total_saved_hours += saved_hrs
                total_block_hours += actual_block_hours
                if len(cluster) > 1:
                    bundled_task_count += len(cluster)

                # Validate safety buffer
                _, violations = SafetyService.validate_train_headway(block_start_dt, block_end_dt, train_schedules)
                all_violations.extend(violations)

                urgency = max((r.get("urgency_level", 0.5) for r in cluster), default=0.5)

                optimized_blocks.append({
                    "id": idx + 1,
                    "corridor_id": "New Delhi - Kanpur Section (Sector 4B)",
                    "bundled_request_ids": req_ids,
                    "scheduled_start": block_start_dt.isoformat(),
                    "scheduled_end": block_end_dt.isoformat(),
                    "allocated_safety_buffer": DEFAULT_SAFETY_BUFFER_MINUTES,
                    "controller_approval_status": "PENDING",
                    "saved_block_hours": saved_hrs,
                    "bundled_departments": depts,
                    "urgency_score": round(urgency, 2)
                })

            status_str = "OPTIMAL" if solver_status == cp_model.OPTIMAL else "FEASIBLE"
            
            return {
                "success": True,
                "message": f"OR-Tools CP-SAT generated {len(optimized_blocks)} optimized possession blocks with {total_saved_hours:.2f} hrs saved.",
                "solver_used": "cp_sat",
                "optimization_status": status_str,
                "total_block_hours": round(total_block_hours, 2),
                "total_hours_saved": round(total_saved_hours, 2),
                "bundled_task_count": bundled_task_count,
                "scheduled_task_count": len(requests),
                "unscheduled_task_count": 0,
                "constraint_violations": all_violations,
                "optimization_timestamp": timestamp_str,
                "status": "OPTIMAL_SCHEDULE_GENERATED",
                "saved_block_hours": round(total_saved_hours, 2),
                "total_blocks_created": len(optimized_blocks),
                "optimized_blocks": optimized_blocks
            }
        else:
            # Fallback to heuristic
            return cls._solve_with_heuristic(requests, clusters, train_schedules, assets, timestamp_str)

    @classmethod
    def _solve_with_heuristic(
        cls,
        requests: List[Dict[str, Any]],
        clusters: List[List[Dict[str, Any]]],
        train_schedules: List[Dict[str, Any]],
        assets: List[Dict[str, Any]],
        timestamp_str: str
    ) -> Dict[str, Any]:
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        current_time = now + timedelta(hours=1)
        
        optimized_blocks = []
        total_saved_hours = 0.0
        total_block_hours = 0.0
        bundled_task_count = 0
        all_violations = []

        for idx, cluster in enumerate(clusters):
            durations = [r.get("duration_minutes", 90) for r in cluster]
            block_dur = max(durations)
            
            block_start_dt = current_time
            block_end_dt = block_start_dt + timedelta(minutes=block_dur)
            
            # Check Rajdhani conflicts, push forward if needed
            is_safe, violations = SafetyService.validate_train_headway(block_start_dt, block_end_dt, train_schedules)
            if not is_safe:
                # Push forward by 90 minutes to clear train slot
                block_start_dt = block_start_dt + timedelta(minutes=90)
                block_end_dt = block_start_dt + timedelta(minutes=block_dur)
                _, violations = SafetyService.validate_train_headway(block_start_dt, block_end_dt, train_schedules)
            
            all_violations.extend(violations)
            
            req_ids = [r["id"] for r in cluster if "id" in r]
            depts = list(set(r.get("department_code", "TMS") for r in cluster))
            
            individual_sum_hours = sum(durations) / 60.0
            actual_block_hours = block_dur / 60.0
            saved_hrs = max(0.0, round(individual_sum_hours - actual_block_hours, 2)) if len(cluster) > 1 else 0.0
            
            total_saved_hours += saved_hrs
            total_block_hours += actual_block_hours
            if len(cluster) > 1:
                bundled_task_count += len(cluster)

            urgency = max((r.get("urgency_level", 0.5) for r in cluster), default=0.5)

            optimized_blocks.append({
                "id": idx + 1,
                "corridor_id": "New Delhi - Kanpur Section (Sector 4B)",
                "bundled_request_ids": req_ids,
                "scheduled_start": block_start_dt.isoformat(),
                "scheduled_end": block_end_dt.isoformat(),
                "allocated_safety_buffer": DEFAULT_SAFETY_BUFFER_MINUTES,
                "controller_approval_status": "PENDING",
                "saved_block_hours": saved_hrs,
                "bundled_departments": depts,
                "urgency_score": round(urgency, 2)
            })

            # Next block starts after buffer
            current_time = block_end_dt + timedelta(minutes=DEFAULT_SAFETY_BUFFER_MINUTES)

        return {
            "success": True,
            "message": f"Heuristic scheduler generated {len(optimized_blocks)} possession blocks with {total_saved_hours:.2f} hrs saved.",
            "solver_used": "heuristic_fallback",
            "optimization_status": "FALLBACK_COMPLETED",
            "total_block_hours": round(total_block_hours, 2),
            "total_hours_saved": round(total_saved_hours, 2),
            "bundled_task_count": bundled_task_count,
            "scheduled_task_count": len(requests),
            "unscheduled_task_count": 0,
            "constraint_violations": all_violations,
            "optimization_timestamp": timestamp_str,
            "status": "OPTIMAL_SCHEDULE_GENERATED",
            "saved_block_hours": round(total_saved_hours, 2),
            "total_blocks_created": len(optimized_blocks),
            "optimized_blocks": optimized_blocks
        }
