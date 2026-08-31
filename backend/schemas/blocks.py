from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.core.constants import BlockStatusEnum

class OptimizedBlockSchema(BaseModel):
    id: int
    corridor_id: str
    bundled_request_ids: List[int]
    scheduled_start: str
    scheduled_end: str
    allocated_safety_buffer: int = 15
    controller_approval_status: str = "PENDING"
    saved_block_hours: float = 0.0
    bundled_departments: List[str] = []
    urgency_score: float = 0.5

class GeneratePlanResponse(BaseModel):
    success: bool = True
    message: str = "Optimization completed successfully"
    solver_used: str  # "cp_sat" | "heuristic_fallback"
    optimization_status: str  # "OPTIMAL" | "FEASIBLE" | "FALLBACK_COMPLETED" | "NO_REQUESTS"
    total_block_hours: float
    total_hours_saved: float
    bundled_task_count: int
    scheduled_task_count: int
    unscheduled_task_count: int
    constraint_violations: List[str] = []
    optimization_timestamp: str
    status: str = "OPTIMAL_SCHEDULE_GENERATED"
    saved_block_hours: float
    total_blocks_created: int
    optimized_blocks: List[OptimizedBlockSchema]

class EmergencyReplanRequest(BaseModel):
    asset_id: str = Field(..., alias="assetId")
    duration_minutes: Optional[int] = Field(120, alias="durationMinutes")
    defect_severity: Optional[int] = Field(5, alias="defectSeverity")
    notes: Optional[str] = Field("Immediate emergency containment required")

    class Config:
        populate_by_name = True

class EmergencyReplanResponse(BaseModel):
    success: bool = True
    message: str = "Emergency re-plan computed"
    status: str = "EMERGENCY_REPLAN_COMPLETED"
    emergency_request_id: int
    solver_used: str
    total_hours_saved: float
    optimized_blocks: List[OptimizedBlockSchema]

class ApproveBlockRequest(BaseModel):
    block_id: int = Field(..., alias="blockId")
    approve: bool

    class Config:
        populate_by_name = True

class ApproveBlockResponse(BaseModel):
    success: bool = True
    status: str = "SUCCESS"
    message: str
    block: Optional[OptimizedBlockSchema] = None
