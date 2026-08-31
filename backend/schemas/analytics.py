from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class RawBlockItem(BaseModel):
    block_id: str
    is_ai_bundled: bool
    duration_hours: float
    corridor_sector: str
    actual_grant_time: str
    planned_grant_time: str
    actual_clearing_time: str
    planned_clearing_time: str
    departments_involved: List[str]
    baseline_duration_hours: float

class AnalyticsResponse(BaseModel):
    apiSource: str
    recordCount: int
    rawBlocks: List[RawBlockItem]
    summaryMetrics: Dict[str, Any]
    performanceComparison: List[Dict[str, Any]]
    resourceUtilization: List[Dict[str, Any]]
    delayImpactData: Dict[str, Any]
