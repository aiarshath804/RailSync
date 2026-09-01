"""
RailSync Optimization Orchestrator.
Coordinates Prioritization, Bundling, CP-SAT/Heuristic Solving, and Safety Guardrail Validation.
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from backend.optimizer import CPOrToolsBlockOptimizer
from backend.services.prioritization_service import PrioritizationService
from backend.services.safety_guardrail_service import SafetyGuardrailService

logger = logging.getLogger("rail_sync_optimizer")

class OptimizationService:
    @staticmethod
    def parse_time(val: Any) -> datetime:
        return SafetyGuardrailService.parse_time(val)

    @classmethod
    def optimize_schedule(
        cls,
        requests: List[Dict[str, Any]],
        train_schedules: List[Dict[str, Any]],
        assets: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates mathematical schedule optimization with safety guardrails.
        """
        timestamp_str = datetime.now().isoformat()
        
        if not requests:
            return {
                "success": True,
                "message": "No pending maintenance requests to optimize",
                "solver_used": "safety_bounded_solver",
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

        # Run prioritized safety scoring
        evaluated_reqs = PrioritizationService.evaluate_batch(
            requests, train_schedules=train_schedules
        )

        # Run Safety Guardrail Solver
        optimizer = CPOrToolsBlockOptimizer(
            evaluated_reqs, train_schedules, assets=assets
        )
        solve_result = optimizer.solve()

        if solve_result.get("status") == "NO_SAFE_PLAN":
            return {
                "success": False,
                "status": "NO_SAFE_PLAN",
                "optimization_status": "NO_SAFE_PLAN",
                "message": solve_result.get("message"),
                "unscheduled_mandatory_tasks": solve_result.get("unscheduled_mandatory_tasks", []),
                "saved_block_hours": 0.0,
                "total_blocks_created": 0,
                "optimized_blocks": [],
                "constraint_violations": solve_result.get("violations", []),
                "optimization_timestamp": timestamp_str
            }

        blocks = solve_result.get("optimized_blocks", [])
        saved_hours = solve_result.get("saved_block_hours", 0.0)

        return {
            "success": solve_result.get("success", True),
            "message": f"Generated {len(blocks)} safety-verified possession blocks with {saved_hours:.2f} hrs saved.",
            "solver_used": "safety_bounded_solver",
            "optimization_status": solve_result.get("status", "OPTIMAL_SCHEDULE_GENERATED"),
            "status": solve_result.get("status", "OPTIMAL_SCHEDULE_GENERATED"),
            "saved_block_hours": saved_hours,
            "total_blocks_created": len(blocks),
            "optimized_blocks": blocks,
            "validation_report": solve_result.get("validation_report"),
            "constraint_violations": solve_result.get("violations", []),
            "optimization_timestamp": timestamp_str
        }
