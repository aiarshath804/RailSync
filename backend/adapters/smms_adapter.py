from datetime import datetime, timedelta
from typing import Dict, Any
from backend.schemas.requests import SMMSIngestSchema
from backend.core.constants import DepartmentEnum, RequestStatusEnum

class SMMSAdapter:
    @staticmethod
    def transform(payload: SMMSIngestSchema) -> Dict[str, Any]:
        criticality_map = {"HIGH": 5, "MEDIUM": 3, "LOW": 1}
        severity = criticality_map.get(payload.criticality_flag.upper(), 3)
        start_time = payload.target_window_start or (datetime.now() + timedelta(hours=1))

        return {
            "department_id": 2,
            "department_code": DepartmentEnum.SMMS.value,
            "asset_id": payload.signal_post_id,
            "requested_start_time": start_time.isoformat(),
            "duration_minutes": payload.repair_time_est or 90,
            "defect_severity": severity,
            "urgency_level": 0.5,
            "status": RequestStatusEnum.PENDING.value,
            "notes": f"SMMS Fault: {payload.fault_type} on Signal Post {payload.signal_post_id} (Detection delay: {payload.hours_since_detection}h)",
            "metadata": {
                "signal_post_id": payload.signal_post_id,
                "fault_type": payload.fault_type,
                "hours_since_detection": payload.hours_since_detection
            }
        }
