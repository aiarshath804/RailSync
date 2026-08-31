from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator
from backend.core.constants import DepartmentEnum, RequestStatusEnum, TrainPriorityEnum

class TMSIngestSchema(BaseModel):
    track_code: str = Field(..., alias="trackCode")
    defect_id: str = Field(..., alias="defectId")
    severity_rank: int = Field(..., ge=1, le=5, alias="severityRank")
    reported_at: Optional[datetime] = Field(default_factory=datetime.now, alias="reportedAt")
    required_repair_duration: Optional[int] = Field(120, ge=15, alias="requiredRepairDuration")
    proposed_date: Optional[datetime] = Field(None, alias="proposedDate")
    inspector_notes: Optional[str] = Field(None, alias="inspectorNotes")

    class Config:
        populate_by_name = True

class SMMSIngestSchema(BaseModel):
    signal_post_id: str = Field(..., alias="signalPostId")
    fault_type: str = Field(..., alias="faultType")
    criticality_flag: str = Field(..., alias="criticalityFlag")  # "HIGH", "MEDIUM", "LOW"
    hours_since_detection: Optional[float] = Field(1.0, alias="hoursSinceDetection")
    repair_time_est: Optional[int] = Field(90, ge=15, alias="repairTimeEst")
    target_window_start: Optional[datetime] = Field(None, alias="targetWindowStart")

    class Config:
        populate_by_name = True

class TDMSIngestSchema(BaseModel):
    section_id: str = Field(..., alias="sectionId")
    ohe_defect_type: str = Field(..., alias="oheDefectType")
    tension_drop_percentage: Optional[float] = Field(15.0, alias="tensionDropPercentage")
    duration_needed: Optional[int] = Field(180, ge=15, alias="durationNeeded")
    earliest_allowed_start: Optional[datetime] = Field(None, alias="earliestAllowedStart")

    class Config:
        populate_by_name = True

class COAIngestSchema(BaseModel):
    train_no: str = Field(..., alias="trainNo")
    train_name: str = Field(..., alias="trainName")
    priority: str = Field(..., alias="priority")  # "RAJDHANI", "EXPRESS", "FREIGHT"
    corridor_id: Optional[str] = Field("New Delhi - Kanpur Section", alias="corridorId")
    scheduled_arrival: Optional[datetime] = Field(None, alias="scheduledArrival")
    scheduled_departure: Optional[datetime] = Field(None, alias="scheduledDeparture")
    delay_minutes: Optional[int] = Field(0, alias="delayMinutes")

    class Config:
        populate_by_name = True

class StandardizedMaintenanceRequest(BaseModel):
    id: Optional[int] = None
    department_id: int
    department_code: DepartmentEnum
    asset_id: str
    requested_start_time: datetime
    duration_minutes: int
    defect_severity: int
    urgency_level: float = 0.5
    status: RequestStatusEnum = RequestStatusEnum.PENDING
    notes: str
    metadata: Dict[str, Any] = {}

class StandardizedTrainSchedule(BaseModel):
    id: Optional[int] = None
    train_number: str
    name: str
    priority_class: TrainPriorityEnum
    corridor_id: str
    arrival_window_start: datetime
    departure_window_end: datetime
    status: str

class IngestResponse(BaseModel):
    status: str = "SUCCESS"
    request_id: int
    ai_criticality_score: float
    message: Optional[str] = None
