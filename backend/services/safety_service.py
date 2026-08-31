from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from backend.core.constants import DEFAULT_SAFETY_BUFFER_MINUTES, TrainPriorityEnum

class SafetyService:
    @staticmethod
    def parse_time(val: Any) -> datetime:
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            # Handle ISO string format
            return datetime.fromisoformat(val.replace("Z", "+00:00").split("+")[0])
        return datetime.now()

    @classmethod
    def validate_train_headway(
        cls, 
        block_start: datetime, 
        block_end: datetime, 
        trains: List[Dict[str, Any]], 
        buffer_minutes: int = DEFAULT_SAFETY_BUFFER_MINUTES
    ) -> Tuple[bool, List[str]]:
        violations = []
        buf = timedelta(minutes=buffer_minutes)
        
        for train in trains:
            try:
                arr = cls.parse_time(train.get("arrival_window_start"))
                dep = cls.parse_time(train.get("departure_window_end"))
                train_prio = train.get("priority_class", "")
                t_num = train.get("train_number", "UNKNOWN")
                
                # Check overlap with safety buffer
                t_window_start = arr - buf
                t_window_end = dep + buf
                
                if max(block_start, t_window_start) < min(block_end, t_window_end):
                    if train_prio == TrainPriorityEnum.RAJDHANI.value:
                        violations.append(
                            f"Safety conflict: Block ({block_start.strftime('%H:%M')}-{block_end.strftime('%H:%M')}) intersects with High-Priority Rajdhani {t_num} window ({arr.strftime('%H:%M')}-{dep.strftime('%H:%M')}) within {buffer_minutes}m buffer"
                        )
            except Exception:
                continue
                
        is_safe = len(violations) == 0
        return is_safe, violations
