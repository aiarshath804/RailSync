from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, Enum, Text
from sqlalchemy.orm import relationship
import enum
import datetime
from backend.database import Base

class DepartmentEnum(str, enum.Enum):
    TMS = "TMS"     # Track Management System
    SMMS = "SMMS"   # Signal & Telecommunication
    TDMS = "TDMS"   # Traction Distribution (OHE)
    COA = "COA"     # Control Office Application

class RequestStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    BUNDLED = "BUNDLED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class TrainPriorityEnum(str, enum.Enum):
    RAJDHANI = "RAJDHANI"   # Premium/High priority
    EXPRESS = "EXPRESS"     # Medium priority
    FREIGHT = "FREIGHT"     # Low priority

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(64), unique=True, nullable=False, index=True)
    source_system = Column(String(20), nullable=False) # TMS, SMMS, TDMS, COA
    filename = Column(String(255), nullable=True)
    total_records = Column(Integer, default=0)
    imported_records = Column(Integer, default=0)
    duplicate_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    imported_at = Column(DateTime, default=datetime.datetime.now)
    status = Column(String(50), default="SUCCESS")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)

class CorridorAsset(Base):
    __tablename__ = "corridor_assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), unique=True, nullable=False, index=True) # e.g. "TRK-01", "SIG-44", "OHE-09"
    name = Column(String(100), nullable=False)
    asset_type = Column(String(50), nullable=False) # TRACK, SIGNAL, OHE, CIVIL
    line_section = Column(String(100), nullable=False) # e.g., "NDLS-HWH-01"
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    speed_limit_kmh = Column(Integer, default=110)
    status = Column(String(50), default="OPERATIONAL") # OPERATIONAL, MAINTENANCE, FAULT

class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(50), unique=True, nullable=True, index=True) # e.g. "REQ-TMS-0001"
    source_system = Column(String(20), default="TMS", nullable=False)
    department_id = Column(Integer, nullable=False, default=1)
    department_code = Column(String(20), default="TMS", nullable=False)
    asset_id = Column(String(50), nullable=False, index=True) # String asset code e.g. "TRK-01"
    asset_type = Column(String(50), default="TRACK")
    corridor_id = Column(String(100), default="NDLS-HWH-01")
    section_id = Column(String(100), default="NDLS-HWH-01")
    location_start_km = Column(Float, default=0.0)
    location_end_km = Column(Float, default=5.0)
    work_type = Column(String(100), default="MAINTENANCE")
    defect_type = Column(String(100), default="DEFECT")
    requested_start_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    defect_severity = Column(Integer, nullable=False, default=3) # Scale 1-5
    urgency_level = Column(Float, nullable=True, default=0.5)      # AI score (0.0 to 1.0)
    status = Column(String(50), default="PENDING", nullable=False)
    notes = Column(Text, nullable=True)
    crew_required = Column(Integer, default=4)
    machines_required = Column(String(100), nullable=True)
    raw_source_reference = Column(String(100), nullable=True, index=True)
    import_batch_id = Column(String(64), nullable=True, index=True)
    imported_at = Column(DateTime, default=datetime.datetime.now)
    due_date = Column(DateTime, nullable=True)
    preferred_end = Column(DateTime, nullable=True)
    criticality_score = Column(Float, default=0.5)
    urgency_score = Column(Float, default=0.5)
    impact_score = Column(Float, default=0.5)
    priority_score = Column(Float, default=0.5)
    priority_level = Column(String(20), default="MEDIUM")
    metadata_json = Column(JSON, nullable=True)

class TrainSchedule(Base):
    __tablename__ = "train_schedules"

    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(50), nullable=False, index=True) # e.g. "12301"
    name = Column(String(100), nullable=False)
    priority_class = Column(String(50), default="EXPRESS", nullable=False) # RAJDHANI, EXPRESS, FREIGHT
    corridor_id = Column(String(100), nullable=False) # e.g., "NDLS-HWH-01"
    section_id = Column(String(100), nullable=True)
    arrival_window_start = Column(DateTime, nullable=False)
    departure_window_end = Column(DateTime, nullable=False)
    delay_minutes = Column(Integer, default=0)
    status = Column(String(50), default="RUNNING") # RUNNING, DELAYED, CANCELLED
    traffic_density_rank = Column(Integer, default=3)
    import_batch_id = Column(String(64), nullable=True, index=True)
    imported_at = Column(DateTime, default=datetime.datetime.now)

class OptimizedBlock(Base):
    __tablename__ = "optimized_blocks"

    id = Column(Integer, primary_key=True, index=True)
    corridor_id = Column(String(100), nullable=False)
    bundled_request_ids = Column(JSON, nullable=False) # JSON list of integer request IDs
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    allocated_safety_buffer = Column(Integer, default=15) # Safety buffer in minutes
    controller_approval_status = Column(String(50), default="PENDING") # PENDING, APPROVED, REJECTED
    saved_block_hours = Column(Float, default=0.0)
    bundled_departments = Column(JSON, nullable=True)
    urgency_score = Column(Float, default=0.5)
