"""
RailSync Data Pipeline: Schema Validation and Error Collector.
Uses Python dataclasses and standard library for 100% dependency-free execution.
"""

import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional


@dataclass
class RowValidationError:
    row: int
    field: str
    message: str
    rejected_value: Optional[str] = None

    def dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CanonicalMaintenanceRequest:
    """
    Unified canonical schema for all maintenance work requests (TMS, SMMS, TDMS).
    """
    request_id: str
    source_system: str
    department: str
    department_id: int
    department_code: str
    asset_id: str
    asset_type: str
    corridor_id: str
    section_id: str
    location_start_km: float
    location_end_km: float
    work_type: str
    defect_type: str
    description: str
    severity: int # 1 to 5
    reported_at: datetime.datetime
    due_date: Optional[datetime.datetime]
    estimated_duration_minutes: int
    preferred_start: datetime.datetime
    preferred_end: Optional[datetime.datetime]
    crew_required: int = 4
    machines_required: Optional[str] = None
    status: str = "PENDING"
    raw_source_reference: Optional[str] = None
    import_batch_id: Optional[str] = None
    imported_at: Optional[datetime.datetime] = None
    criticality_score: float = 0.5
    urgency_score: float = 0.5
    impact_score: float = 0.5
    priority_score: float = 0.5
    priority_level: str = "MEDIUM"
    safety_override: bool = False
    override_reason: Optional[str] = None
    scoring_method: str = "deterministic_hybrid"
    scored_at: Optional[str] = None
    bundle_id: Optional[int] = None
    scheduled_start: Optional[datetime.datetime] = None
    scheduled_end: Optional[datetime.datetime] = None
    optimized_block_id: Optional[int] = None
    notes: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def validate(self, row_idx: int = 1) -> Optional[RowValidationError]:
        if not (1 <= self.severity <= 5):
            return RowValidationError(row=row_idx, field="severity", message=f"Severity must be in range 1-5, got {self.severity}", rejected_value=str(self.severity))
        if self.estimated_duration_minutes < 15:
            return RowValidationError(row=row_idx, field="estimated_duration_minutes", message=f"Duration must be at least 15 minutes, got {self.estimated_duration_minutes}", rejected_value=str(self.estimated_duration_minutes))
        if self.location_end_km < self.location_start_km:
            return RowValidationError(row=row_idx, field="location_end_km", message=f"End KM ({self.location_end_km}) cannot be less than Start KM ({self.location_start_km})", rejected_value=str(self.location_end_km))
        return None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["reported_at"] = self.reported_at.isoformat() if self.reported_at else ""
        d["due_date"] = self.due_date.isoformat() if self.due_date else ""
        d["preferred_start"] = self.preferred_start.isoformat() if self.preferred_start else ""
        d["preferred_end"] = self.preferred_end.isoformat() if self.preferred_end else ""
        d["imported_at"] = self.imported_at.isoformat() if self.imported_at else ""
        return d


@dataclass
class CanonicalTrainSchedule:
    """
    Unified canonical schema for train operations and COA timetables.
    """
    train_number: str
    name: str
    priority_class: str # RAJDHANI, EXPRESS, FREIGHT
    corridor_id: str
    section_id: str
    arrival_window_start: datetime.datetime
    departure_window_end: datetime.datetime
    delay_minutes: int = 0
    status: str = "RUNNING"
    traffic_density_rank: int = 3
    import_batch_id: Optional[str] = None
    imported_at: Optional[datetime.datetime] = None

    def validate(self, row_idx: int = 1) -> Optional[RowValidationError]:
        if self.priority_class not in ["RAJDHANI", "EXPRESS", "FREIGHT"]:
            return RowValidationError(row=row_idx, field="priority_class", message=f"Invalid priority class {self.priority_class}", rejected_value=self.priority_class)
        if self.departure_window_end <= self.arrival_window_start:
            return RowValidationError(row=row_idx, field="departure_window_end", message=f"Departure window end must be after arrival start", rejected_value=str(self.departure_window_end))
        return None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["arrival_window_start"] = self.arrival_window_start.isoformat() if self.arrival_window_start else ""
        d["departure_window_end"] = self.departure_window_end.isoformat() if self.departure_window_end else ""
        d["imported_at"] = self.imported_at.isoformat() if self.imported_at else ""
        return d
