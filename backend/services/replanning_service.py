import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from backend.database.repository import repository
from backend.services.optimization_service import OptimizationService
from backend.core.event_bus import event_bus

logger = logging.getLogger("rail_sync_replanning")

class ReplanningService:
    @classmethod
    async def trigger_emergency_replan(
        cls,
        asset_id: str,
        duration_minutes: int = 120,
        defect_severity: int = 5,
        notes: str = "Immediate emergency containment required"
    ) -> Dict[str, Any]:
        # 1. Update asset status to FAULT
        repository.update_asset_status(asset_id, "FAULT")
        
        # 2. Add emergency request
        now = datetime.now()
        emergency_req = {
            "department_id": 1,
            "department_code": "TMS",
            "asset_id": asset_id,
            "requested_start_time": now.isoformat(),
            "duration_minutes": duration_minutes,
            "defect_severity": defect_severity,
            "urgency_level": 0.99,
            "status": "PENDING",
            "notes": f"EMERGENCY PRIORITY 1: {notes} on Asset {asset_id}"
        }
        saved_req = repository.add_maintenance_request(emergency_req)
        
        # 3. Re-optimize schedule
        all_requests = repository.get_maintenance_requests()
        pending_requests = [r for r in all_requests if r.get("status") in ("PENDING", "BUNDLED")]
        train_schedules = repository.get_train_schedules()
        assets = repository.get_assets()
        
        optimization_result = OptimizationService.optimize_schedule(
            pending_requests,
            train_schedules,
            assets
        )
        
        new_blocks = optimization_result.get("optimized_blocks", [])
        repository.save_optimized_blocks(new_blocks)
        
        # 4. Broadcast live events
        await event_bus.broadcast("emergency_event", {
            "asset_id": asset_id,
            "emergency_request_id": saved_req["id"],
            "severity": defect_severity,
            "notes": notes
        })
        
        await event_bus.broadcast("plan_reoptimized", {
            "trigger": "EMERGENCY_REPLAN",
            "blocks_count": len(new_blocks),
            "solver_used": optimization_result.get("solver_used")
        })

        await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

        return {
            "success": True,
            "message": f"Emergency re-plan computed for {asset_id}. Corridor halted / prioritized.",
            "status": "EMERGENCY_REPLAN_COMPLETED",
            "emergency_request_id": saved_req["id"],
            "solver_used": optimization_result.get("solver_used"),
            "total_hours_saved": optimization_result.get("total_hours_saved", 0.0),
            "optimized_blocks": new_blocks
        }
