from fastapi import APIRouter, HTTPException, status
from backend.schemas.blocks import (
    GeneratePlanResponse,
    EmergencyReplanRequest,
    EmergencyReplanResponse,
    ApproveBlockRequest,
    ApproveBlockResponse
)
from backend.database.repository import repository
from backend.services.optimization_service import OptimizationService
from backend.services.replanning_service import ReplanningService
from backend.core.event_bus import event_bus

router = APIRouter(prefix="/optimize", tags=["Optimization & Planning"])

@router.post("/generate-plan", response_model=GeneratePlanResponse)
async def generate_optimized_plan():
    requests = repository.get_maintenance_requests()
    pending = [r for r in requests if r.get("status") in ("PENDING", "BUNDLED")]
    trains = repository.get_train_schedules()
    assets = repository.get_assets()

    result = OptimizationService.optimize_schedule(pending, trains, assets)
    
    # Save optimized blocks into repository
    new_blocks = result.get("optimized_blocks", [])
    repository.save_optimized_blocks(new_blocks)

    # Mark requests as BUNDLED
    for block in new_blocks:
        for req_id in block.get("bundled_request_ids", []):
            repository.update_request_status(req_id, "BUNDLED")

    # Broadcast event
    await event_bus.broadcast("plan_generated", {
        "blocks_count": len(new_blocks),
        "total_saved_hours": result.get("total_hours_saved", 0.0),
        "solver_used": result.get("solver_used")
    })
    await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

    return result

@router.post("/emergency-replan", response_model=EmergencyReplanResponse)
async def emergency_replan(payload: EmergencyReplanRequest):
    return await ReplanningService.trigger_emergency_replan(
        asset_id=payload.asset_id,
        duration_minutes=payload.duration_minutes or 120,
        defect_severity=payload.defect_severity or 5,
        notes=payload.notes or "Immediate emergency containment required"
    )

@router.post("/approve-block", response_model=ApproveBlockResponse)
async def approve_block(payload: ApproveBlockRequest):
    updated = repository.update_block_approval(payload.block_id, payload.approve)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Block with ID {payload.block_id} not found."
        )

    action = "approved" if payload.approve else "rejected"
    
    await event_bus.broadcast("block_approved" if payload.approve else "block_rejected", {
        "block_id": payload.block_id,
        "status": updated.get("controller_approval_status")
    })
    await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

    return ApproveBlockResponse(
        success=True,
        status="SUCCESS",
        message=f"Possession block {payload.block_id} {action} by Traffic Controller.",
        block=updated
    )

@router.delete("/delete-request/{request_id}")
async def delete_maintenance_request(request_id: int):
    deleted = repository.delete_maintenance_request(request_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Maintenance request {request_id} not found."
        )
    
    await event_bus.broadcast("request_deleted", {"request_id": request_id})
    await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Maintenance request #{request_id} successfully cancelled."
    }
