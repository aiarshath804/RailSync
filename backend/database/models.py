from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, Enum
from sqlalchemy.orm import relationship
import enum
from backend.core.constants import DepartmentEnum, RequestStatusEnum, TrainPriorityEnum
from backend.database.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    code = Column(Enum(DepartmentEnum), unique=True, nullable=False)

    requests = relationship("MaintenanceRequest", back_populates="department")

class CorridorAsset(Base):
    __tablename__ = "corridor_assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    asset_type = Column(String(50), nullable=False)  # "TRACK", "SIGNAL", "OHE"
    line_section = Column(String(100), nullable=False)
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    speed_limit_kmh = Column(Integer, default=110)
    status = Column(String(50), default="OPERATIONAL")  # OPERATIONAL, MAINTENANCE, FAULT

    requests = relationship("MaintenanceRequest", back_populates="asset")

class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("corridor_assets.id"), nullable=False)
    requested_start_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    defect_severity = Column(Integer, nullable=False)  # Scale 1-5
    urgency_level = Column(Float, nullable=True)       # ML predicted score (0.0 to 1.0)
    status = Column(Enum(RequestStatusEnum), default=RequestStatusEnum.PENDING, nullable=False)
    notes = Column(String(500), nullable=True)

    department = relationship("Department", back_populates="requests")
    asset = relationship("CorridorAsset", back_populates="requests")

class TrainSchedule(Base):
    __tablename__ = "train_schedules"

    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    priority_class = Column(Enum(TrainPriorityEnum), nullable=False)
    corridor_id = Column(String(50), nullable=False)
    arrival_window_start = Column(DateTime, nullable=False)
    departure_window_end = Column(DateTime, nullable=False)
    status = Column(String(50), default="RUNNING")

class OptimizedBlock(Base):
    __tablename__ = "optimized_blocks"

    id = Column(Integer, primary_key=True, index=True)
    corridor_id = Column(String(50), nullable=False)
    bundled_request_ids = Column(JSON, nullable=False)
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    allocated_safety_buffer = Column(Integer, default=15)
    controller_approval_status = Column(String(50), default="PENDING")
    saved_block_hours = Column(Float, default=0.0)
