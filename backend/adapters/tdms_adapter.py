from datetime import datetime, timedelta
from typing import Dict, Any
from backend.schemas.requests import TDMSIngestSchema
from backend.core.constants import DepartmentEnum, RequestStatusEnum

class TDMSAdapter:
    @staticmethod
    def transform(payload: TDMSIngestSchema) -> Dict[str, Any]:
        tension = payload.tension_drop_percentage or 15.0
        if tension >= 30:
            severity = 5
        elif tension >= 20:
            severity = 4
        elif tension >= 10:
            severity = 3
        else:
            severity = 2

        start_time = payload.earliest_allowed_start or (datetime.now() + timedelta(hours=2))

        return {
            "department_id": 3,
            "department_code": DepartmentEnum.TDMS.value,
            "asset_id": payload.section_id,
            "requested_start_time": start_time.isoformat(),
            "duration_minutes": payload.duration_needed or 180,
            "defect_severity": severity,
            "urgency_level": 0.5,
            "status": RequestStatusEnum.PENDING.value,
            "notes": f"TDMS OHE Anomaly: {payload.ohe_defect_type} on Section {payload.section_id} (Tension drop: {tension}%)",
            "metadata": {
                "section_id": payload.section_id,
                "ohe_defect_type": payload.ohe_defect_type,
                "tension_drop_percentage": tension
            }
        }
