from datetime import datetime
from typing import Dict, Any
from backend.schemas.requests import TMSIngestSchema, StandardizedMaintenanceRequest
from backend.core.constants import DepartmentEnum, RequestStatusEnum

class TMSAdapter:
    @staticmethod
    def transform(payload: TMSIngestSchema) -> Dict[str, Any]:
        return {
            "department_id": 1,
            "department_code": DepartmentEnum.TMS.value,
            "asset_id": payload.track_code,
            "requested_start_time": (payload.proposed_date or payload.reported_at or datetime.now()).isoformat(),
            "duration_minutes": payload.required_repair_duration or 120,
            "defect_severity": payload.severity_rank,
            "urgency_level": 0.5,
            "status": RequestStatusEnum.PENDING.value,
            "notes": f"TMS Defect {payload.defect_id}: {payload.inspector_notes or 'Track bed stabilization / tamping needed'}",
            "metadata": {
                "defect_id": payload.defect_id,
                "track_code": payload.track_code
            }
        }
