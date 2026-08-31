from enum import Enum

class DepartmentEnum(str, Enum):
    TMS = "TMS"     # Track Management System
    SMMS = "SMMS"   # Signal & Telecommunication
    TDMS = "TDMS"   # Traction Distribution (OHE)
    COA = "COA"     # Control Office Application

class RequestStatusEnum(str, Enum):
    PENDING = "PENDING"
    BUNDLED = "BUNDLED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class TrainPriorityEnum(str, Enum):
    RAJDHANI = "RAJDHANI"   # Premium/High priority
    EXPRESS = "EXPRESS"     # Medium priority
    FREIGHT = "FREIGHT"     # Standard priority

class BlockStatusEnum(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AssetStatusEnum(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    MAINTENANCE = "MAINTENANCE"
    FAULT = "FAULT"

# Operational Constants
DEFAULT_SAFETY_BUFFER_MINUTES = 15
MAX_BLOCK_DURATION_MINUTES = 240
MAX_SPATIAL_PROXIMITY_KM = 5.0
DEFAULT_TIME_PROXIMITY_MINUTES = 120.0
SOLVER_TIMEOUT_SECONDS = 5.0
