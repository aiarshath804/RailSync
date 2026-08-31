from datetime import datetime, timedelta
from typing import Dict, Any
from backend.schemas.requests import COAIngestSchema
from backend.core.constants import TrainPriorityEnum

class COAAdapter:
    @staticmethod
    def transform(payload: COAIngestSchema) -> Dict[str, Any]:
        prio_upper = payload.priority.upper()
        if "RAJ" in prio_upper or "VB" in prio_upper or "VANDE" in prio_upper:
            prio = TrainPriorityEnum.RAJDHANI.value
        elif "EXP" in prio_upper or "SF" in prio_upper or "MAIL" in prio_upper or "DURONTO" in prio_upper:
            prio = TrainPriorityEnum.EXPRESS.value
        else:
            prio = TrainPriorityEnum.FREIGHT.value

        arr = payload.scheduled_arrival or (datetime.now() + timedelta(hours=1))
        dep = payload.scheduled_departure or (arr + timedelta(minutes=45))

        status_str = f"DELAYED_{payload.delay_minutes}M" if payload.delay_minutes and payload.delay_minutes > 0 else "ON_TIME"

        return {
            "train_number": payload.train_no,
            "name": payload.train_name,
            "priority_class": prio,
            "corridor_id": payload.corridor_id or "New Delhi - Kanpur Section",
            "arrival_window_start": arr.isoformat(),
            "departure_window_end": dep.isoformat(),
            "status": status_str,
            "delay_minutes": payload.delay_minutes or 0
        }
