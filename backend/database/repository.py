import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

logger = logging.getLogger("rail_sync_repository")
STORE_FILE = "rail_sync_store.json"

def get_initial_seed_data() -> Dict[str, Any]:
    now = datetime.now()
    base_time = now.replace(minute=0, second=0, microsecond=0)
    
    return {
        "assets": [
            {
                "id": 1,
                "asset_id": "TRK-01",
                "name": "Up Line Track Bed (KM 14.2 - 18.5)",
                "asset_type": "TRACK",
                "line_section": "Sector 4B North",
                "start_km": 14.2,
                "end_km": 18.5,
                "speed_limit_kmh": 110,
                "status": "OPERATIONAL"
            },
            {
                "id": 2,
                "asset_id": "TRK-02",
                "name": "Down Line Switch Rails (KM 18.5 - 22.0)",
                "asset_type": "TRACK",
                "line_section": "Sector 4B Central",
                "start_km": 18.5,
                "end_km": 22.0,
                "speed_limit_kmh": 90,
                "status": "OPERATIONAL"
            },
            {
                "id": 3,
                "asset_id": "SIG-44",
                "name": "Automatic Interlocking Signaling Point 44",
                "asset_type": "SIGNAL",
                "line_section": "Sector 4B Interlock",
                "start_km": 16.0,
                "end_km": 16.2,
                "speed_limit_kmh": 110,
                "status": "OPERATIONAL"
            },
            {
                "id": 4,
                "asset_id": "OHE-09",
                "name": "25kV AC Traction Catenary Mast 09",
                "asset_type": "OHE",
                "line_section": "Sector 4B Overhead",
                "start_km": 15.0,
                "end_km": 19.0,
                "speed_limit_kmh": 110,
                "status": "OPERATIONAL"
            },
            {
                "id": 5,
                "asset_id": "TRK-9",
                "name": "Main Corridor Track 9",
                "asset_type": "TRACK",
                "line_section": "NDLS-CNB Central",
                "start_km": 20.0,
                "end_km": 25.0,
                "speed_limit_kmh": 120,
                "status": "OPERATIONAL"
            }
        ],
        "train_schedules": [
            {
                "id": 1,
                "train_number": "12301",
                "name": "Howrah Rajdhani Express",
                "priority_class": "RAJDHANI",
                "corridor_id": "New Delhi - Kanpur Section",
                "arrival_window_start": (base_time + timedelta(hours=1, minutes=10)).isoformat(),
                "departure_window_end": (base_time + timedelta(hours=1, minutes=40)).isoformat(),
                "status": "ON_TIME"
            },
            {
                "id": 2,
                "train_number": "12260",
                "name": "Sealdah Duronto Express",
                "priority_class": "EXPRESS",
                "corridor_id": "New Delhi - Kanpur Section",
                "arrival_window_start": (base_time + timedelta(hours=3, minutes=15)).isoformat(),
                "departure_window_end": (base_time + timedelta(hours=3, minutes=45)).isoformat(),
                "status": "DELAYED_10M"
            },
            {
                "id": 3,
                "train_number": "FRT-991",
                "name": "Container Freight Express",
                "priority_class": "FREIGHT",
                "corridor_id": "New Delhi - Kanpur Section",
                "arrival_window_start": (base_time + timedelta(hours=5, minutes=0)).isoformat(),
                "departure_window_end": (base_time + timedelta(hours=5, minutes=50)).isoformat(),
                "status": "PLANNED"
            }
        ],
        "maintenance_requests": [
            {
                "id": 101,
                "department_id": 1,
                "department_code": "TMS",
                "asset_id": "TRK-01",
                "requested_start_time": (base_time + timedelta(hours=2)).isoformat(),
                "duration_minutes": 120,
                "defect_severity": 4,
                "urgency_level": 0.88,
                "status": "PENDING",
                "notes": "Deep ballast screening and sleeper tamping required due to ultrasonic wave anomaly"
            },
            {
                "id": 102,
                "department_id": 2,
                "department_code": "SMMS",
                "asset_id": "SIG-44",
                "requested_start_time": (base_time + timedelta(hours=2, minutes=15)).isoformat(),
                "duration_minutes": 90,
                "defect_severity": 3,
                "urgency_level": 0.72,
                "status": "PENDING",
                "notes": "Point machine motor calibration and relay contact insulation test"
            },
            {
                "id": 103,
                "department_id": 3,
                "department_code": "TDMS",
                "asset_id": "OHE-09",
                "requested_start_time": (base_time + timedelta(hours=2, minutes=30)).isoformat(),
                "duration_minutes": 105,
                "defect_severity": 4,
                "urgency_level": 0.82,
                "status": "PENDING",
                "notes": "Contact wire stagger adjustment and dropper tensioning"
            },
            {
                "id": 104,
                "department_id": 1,
                "department_code": "TMS",
                "asset_id": "TRK-02",
                "requested_start_time": (base_time + timedelta(hours=4)).isoformat(),
                "duration_minutes": 90,
                "defect_severity": 2,
                "urgency_level": 0.45,
                "status": "PENDING",
                "notes": "Fishplate bolt tightening and switch rail lubrication"
            }
        ],
        "optimized_blocks": []
    }

class RailSyncRepository:
    def __init__(self, store_file: str = STORE_FILE):
        self.store_file = store_file
        self._data = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.store_file):
            try:
                with open(self.store_file, "r") as f:
                    data = json.load(f)
                    if "assets" in data and "maintenance_requests" in data:
                        return data
            except Exception as e:
                logger.warning(f"Could not load store file {self.store_file}: {e}. Initializing with seed data.")
        
        initial = get_initial_seed_data()
        self._save(initial)
        return initial

    def _save(self, data: Optional[Dict[str, Any]] = None):
        if data is None:
            data = self._data
        try:
            with open(self.store_file, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist state to disk: {e}")

    # Assets
    def get_assets(self) -> List[Dict[str, Any]]:
        return self._data.get("assets", [])

    def get_asset_by_id(self, asset_id: str) -> Optional[Dict[str, Any]]:
        for asset in self._data.get("assets", []):
            if asset.get("asset_id") == asset_id or str(asset.get("id")) == str(asset_id):
                return asset
        return None

    def update_asset_status(self, asset_id: str, status: str) -> bool:
        for asset in self._data.get("assets", []):
            if asset.get("asset_id") == asset_id or str(asset.get("id")) == str(asset_id):
                asset["status"] = status
                self._save()
                return True
        return False

    # Train Schedules
    def get_train_schedules(self) -> List[Dict[str, Any]]:
        return self._data.get("train_schedules", [])

    def add_train_schedule(self, schedule: Dict[str, Any]) -> Dict[str, Any]:
        schedules = self._data.setdefault("train_schedules", [])
        if "id" not in schedule or not schedule["id"]:
            next_id = max([s.get("id", 0) for s in schedules], default=0) + 1
            schedule["id"] = next_id
        
        # Check if already exists by train_number
        existing_idx = next((i for i, s in enumerate(schedules) if s.get("train_number") == schedule.get("train_number")), None)
        if existing_idx is not None:
            schedules[existing_idx] = schedule
        else:
            schedules.append(schedule)
        
        self._save()
        return schedule

    # Maintenance Requests
    def get_maintenance_requests(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        requests = self._data.get("maintenance_requests", [])
        if status:
            return [r for r in requests if r.get("status") == status]
        return requests

    def get_request_by_id(self, req_id: int) -> Optional[Dict[str, Any]]:
        for r in self._data.get("maintenance_requests", []):
            if r.get("id") == req_id:
                return r
        return None

    def add_maintenance_request(self, req: Dict[str, Any]) -> Dict[str, Any]:
        requests = self._data.setdefault("maintenance_requests", [])
        if "id" not in req or not req["id"]:
            next_id = max([r.get("id", 0) for r in requests], default=100) + 1
            req["id"] = next_id
        requests.append(req)
        self._save()
        return req

    def update_request_status(self, req_id: int, status: str) -> bool:
        for r in self._data.get("maintenance_requests", []):
            if r.get("id") == req_id:
                r["status"] = status
                self._save()
                return True
        return False

    def delete_maintenance_request(self, req_id: int) -> bool:
        requests = self._data.get("maintenance_requests", [])
        initial_len = len(requests)
        self._data["maintenance_requests"] = [r for r in requests if r.get("id") != req_id]
        if len(self._data["maintenance_requests"]) < initial_len:
            # Also clean up from any blocks
            for block in self._data.get("optimized_blocks", []):
                block["bundled_request_ids"] = [rid for rid in block.get("bundled_request_ids", []) if rid != req_id]
            self._save()
            return True
        return False

    # Optimized Blocks
    def get_optimized_blocks(self) -> List[Dict[str, Any]]:
        return self._data.get("optimized_blocks", [])

    def get_block_by_id(self, block_id: int) -> Optional[Dict[str, Any]]:
        for b in self._data.get("optimized_blocks", []):
            if b.get("id") == block_id:
                return b
        return None

    def save_optimized_blocks(self, blocks: List[Dict[str, Any]]):
        self._data["optimized_blocks"] = blocks
        self._save()

    def update_block_approval(self, block_id: int, approve: bool) -> Optional[Dict[str, Any]]:
        target_block = None
        for b in self._data.get("optimized_blocks", []):
            if b.get("id") == block_id:
                b["controller_approval_status"] = "APPROVED" if approve else "REJECTED"
                target_block = b
                break
        
        if target_block:
            # Update associated maintenance request statuses
            for req_id in target_block.get("bundled_request_ids", []):
                self.update_request_status(req_id, "APPROVED" if approve else "REJECTED")
            
            # If approved, update associated assets to MAINTENANCE
            if approve:
                req_ids = target_block.get("bundled_request_ids", [])
                for r in self._data.get("maintenance_requests", []):
                    if r.get("id") in req_ids:
                        self.update_asset_status(r.get("asset_id"), "MAINTENANCE")
            
            self._save()
        return target_block

    def get_corridor_state(self) -> Dict[str, Any]:
        return {
            "is_live": True,
            "last_updated": datetime.now().isoformat(),
            "assets": self.get_assets(),
            "train_schedules": self.get_train_schedules(),
            "maintenance_requests": self.get_maintenance_requests(),
            "optimized_blocks": self.get_optimized_blocks()
        }

# Global repository instance
repository = RailSyncRepository()
