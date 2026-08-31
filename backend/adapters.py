from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, field_validator
from backend.models import DepartmentEnum, TrainPriorityEnum
from backend.pipeline.normalizer import SeverityNormalizer, LocationNormalizer

# -------------------------------------------------------------
# Input Payloads (Multi-Format Department Systems)
# -------------------------------------------------------------

class TMSPayload(BaseModel):
    """
    Track Management System payload schema.
    Tracks track structural integrity, rail welds, sleeper faults, etc.
    """
    track_code: str = Field(..., alias="trackCode")
    defect_id: str = Field(..., alias="defectId")
    severity_rank: int = Field(..., ge=1, le=5, alias="severityRank")
    reported_at: datetime = Field(..., alias="reportedAt")
    required_repair_duration: int = Field(..., ge=15, alias="requiredRepairDuration")
    proposed_date: datetime = Field(..., alias="proposedDate")
    inspector_notes: Optional[str] = Field(None, alias="inspectorNotes")

    @field_validator("severity_rank")
    @classmethod
    def validate_severity(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("Severity must be between 1 and 5")
        return v

class SMMSPayload(BaseModel):
    """
    Signal & Telecommunication payload schema.
    Tracks points failures, interlocking issues, track circuit faults, signal posts.
    """
    signal_post_id: str = Field(..., alias="signalPostId")
    fault_type: str = Field(..., alias="faultType")
    criticality_flag: str = Field(..., alias="criticalityFlag") # "HIGH", "MEDIUM", "LOW"
    hours_since_detection: float = Field(..., alias="hoursSinceDetection")
    repair_time_est: int = Field(..., alias="repairTimeEst")
    target_window_start: datetime = Field(..., alias="targetWindowStart")

class TDMSPayload(BaseModel):
    """
    Traction Distribution (Overhead Equipment - OHE) payload schema.
    Tracks contact wire wear, catenary wire tension, isolator faults, substations.
    """
    section_id: str = Field(..., alias="sectionId")
    ohe_defect_type: str = Field(..., alias="oheDefectType")
    tension_drop_percentage: float = Field(..., alias="tensionDropPercentage")
    duration_needed: int = Field(..., alias="durationNeeded")
    earliest_allowed_start: datetime = Field(..., alias="earliestAllowedStart")

class COAPayload(BaseModel):
    """
    Control Office Application (COA) train schedule payload.
    Provides live timetable revisions and train priority shifts.
    """
    train_no: str = Field(..., alias="trainNo")
    train_name: str = Field(..., alias="trainName")
    priority: str = Field(..., alias="priority") # "RAJDHANI", "EXPRESS", "FREIGHT"
    corridor_id: str = Field(..., alias="corridorId")
    scheduled_arrival: datetime = Field(..., alias="scheduledArrival")
    scheduled_departure: datetime = Field(..., alias="scheduledDeparture")
    delay_minutes: int = Field(0, alias="delayMinutes")

# -------------------------------------------------------------
# Ingestion Adapters & Standardizers
# -------------------------------------------------------------

class StandardizedMaintenanceRequest(BaseModel):
    department: DepartmentEnum
    asset_id: str
    requested_start_time: datetime
    duration_minutes: int
    defect_severity: int
    notes: str
    metadata: Dict[str, Any]

class StandardizedTrainSchedule(BaseModel):
    train_number: str
    name: str
    priority_class: TrainPriorityEnum
    corridor_id: str
    arrival_window_start: datetime
    departure_window_end: datetime
    status: str

class DataAdapterPipeline:
    @staticmethod
    def transform_tms(payload: TMSPayload) -> StandardizedMaintenanceRequest:
        """
        Adapts TMS track defects to the standardized schema.
        """
        normalized_sev = SeverityNormalizer.normalize_severity(payload.severity_rank)
        return StandardizedMaintenanceRequest(
            department=DepartmentEnum.TMS,
            asset_id=payload.track_code.upper().strip(),
            requested_start_time=payload.proposed_date,
            duration_minutes=payload.required_repair_duration,
            defect_severity=normalized_sev,
            notes=f"Defect ID: {payload.defect_id}. {payload.inspector_notes or ''}",
            metadata={
                "reported_at": payload.reported_at.isoformat(),
                "system_origin": "TMS",
                "defect_id": payload.defect_id
            }
        )

    @staticmethod
    def transform_smms(payload: SMMSPayload) -> StandardizedMaintenanceRequest:
        """
        Adapts SMMS signal/telecom faults.
        Uses centralized SeverityNormalizer.
        """
        mapped_severity = SeverityNormalizer.normalize_severity(payload.criticality_flag)

        return StandardizedMaintenanceRequest(
            department=DepartmentEnum.SMMS,
            asset_id=payload.signal_post_id.upper().strip(),
            requested_start_time=payload.target_window_start,
            duration_minutes=payload.repair_time_est,
            defect_severity=mapped_severity,
            notes=f"Signal Post Fault: {payload.fault_type}. Hours active: {payload.hours_since_detection}",
            metadata={
                "hours_since_detection": payload.hours_since_detection,
                "system_origin": "SMMS",
                "fault_type": payload.fault_type
            }
        )

    @staticmethod
    def transform_tdms(payload: TDMSPayload) -> StandardizedMaintenanceRequest:
        """
        Adapts TDMS Overhead Equipment faults.
        Uses centralized TDMS tension drop normalizer.
        """
        severity = SeverityNormalizer.normalize_tdms_tension_drop(payload.tension_drop_percentage)

        return StandardizedMaintenanceRequest(
            department=DepartmentEnum.TDMS,
            asset_id=payload.section_id.upper().strip(),
            requested_start_time=payload.earliest_allowed_start,
            duration_minutes=payload.duration_needed,
            defect_severity=severity,
            notes=f"OHE Fault: {payload.ohe_defect_type}. Tension Drop: {payload.tension_drop_percentage}%",
            metadata={
                "tension_drop_percentage": payload.tension_drop_percentage,
                "system_origin": "TDMS",
                "defect_type": payload.ohe_defect_type
            }
        )

    @staticmethod
    def transform_coa(payload: COAPayload) -> StandardizedTrainSchedule:
        """
        Adapts COA train scheduling timelines and priorities.
        """
        priority_str = payload.priority.upper().strip()
        if "RAJDHANI" in priority_str or "VANDE" in priority_str or "SHATABDI" in priority_str:
            mapped_priority = TrainPriorityEnum.RAJDHANI
        elif "FREIGHT" in priority_str or "GOODS" in priority_str:
            mapped_priority = TrainPriorityEnum.FREIGHT
        else:
            mapped_priority = TrainPriorityEnum.EXPRESS

        status = "RUNNING" if payload.delay_minutes <= 0 else f"DELAYED BY {payload.delay_minutes} MINS"
        corridor = LocationNormalizer.normalize_corridor(payload.corridor_id)

        return StandardizedTrainSchedule(
            train_number=payload.train_no.strip(),
            name=payload.train_name.strip(),
            priority_class=mapped_priority,
            corridor_id=corridor,
            arrival_window_start=payload.scheduled_arrival,
            departure_window_end=payload.scheduled_departure,
            status=status
        )
