from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.schemas.blocks import OptimizedBlockSchema

class DashboardMetricsResponse(BaseModel):
    saved_block_hours: float
    asset_availability_pct: float
    compliance_rate: float
    pending_requests_count: int
    bundled_requests_count: int
    approved_blocks_count: int
    corridor_uptime_pct: Optional[float] = None
    total_active_blocks: Optional[int] = None

class CorridorAssetSchema(BaseModel):
    id: int
    asset_id: str
    name: str
    asset_type: str
    line_section: str
    start_km: float
    end_km: float
    speed_limit_kmh: int = 110
    status: str = "OPERATIONAL"

class CorridorStateResponse(BaseModel):
    is_live: bool = True
    last_updated: str
    assets: List[Dict[str, Any]]
    train_schedules: List[Dict[str, Any]]
    maintenance_requests: List[Dict[str, Any]]
    optimized_blocks: List[Dict[str, Any]]
