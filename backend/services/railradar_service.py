"""
RailRadar Indian Railways Live Train Data Integration and Train-to-Block Mapping Engine.
Focuses strictly on the five prototype operational railway blocks in North Tamil Nadu:
  B1: Chennai Central / MGR Chennai Central (MAS) → Basin Bridge (BBQ)
  B2: Basin Bridge (BBQ) → Perambur (PER)
  B3: Perambur (PER) → Ambattur (ABU)
  B4: Ambattur (ABU) → Avadi (AVD)
  B5: Avadi (AVD) → Tiruvallur (TRL)

Strict Data Policy:
  - Live Mode is default.
  - Zero automatic fallback to mock/demo/default/sample/hardcoded trains on live API failure.
  - Returns explicit error states (401, 403, 404, 429, 50x, NETWORK_ERROR, NO_API_KEY).
  - Only previously successful live responses may be returned as cached data with last update timestamp.
  - Simulation Mode requires explicit user activation and displays a prominent warning banner.
"""

import os
import json
import time
import datetime
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional, Tuple

CORRIDOR_TITLE = "North Tamil Nadu Railway Operations Demo – Chennai Central to Tiruvallur Corridor"
CORRIDOR_DISCLAIMER = (
    "These are prototype operational segments created for this demonstration. "
    "Do NOT represent them as official Indian Railways signalling blocks."
)
EMERGENCY_DISCLAIMER = (
    "Emergency restriction recommended to authorized railway operations control. "
    "Decision-support prototype for authorized traffic controllers."
)

CORRIDOR_STATIONS = [
    {"code": "MAS", "name": "MGR Chennai Central", "km": 0.0, "is_terminal": True},
    {"code": "BBQ", "name": "Basin Bridge Junction", "km": 2.2, "is_terminal": False},
    {"code": "PER", "name": "Perambur", "km": 5.6, "is_terminal": False},
    {"code": "ABU", "name": "Ambattur", "km": 15.0, "is_terminal": False},
    {"code": "AVD", "name": "Avadi", "km": 21.4, "is_terminal": False},
    {"code": "TRL", "name": "Tiruvallur", "km": 41.8, "is_terminal": True},
]

CORRIDOR_BLOCKS_DEF = [
    {
        "block_id": "B1",
        "name": "Chennai Central (MAS) → Basin Bridge (BBQ)",
        "from_station": "MAS",
        "to_station": "BBQ",
        "start_km": 0.0,
        "end_km": 2.2,
        "length_km": 2.2,
        "speed_limit_kmh": 45,
        "track_count": 4,
        "description": "Terminal throat interlocking sector with suburban EMU & express movements",
    },
    {
        "block_id": "B2",
        "name": "Basin Bridge (BBQ) → Perambur (PER)",
        "from_station": "BBQ",
        "to_station": "PER",
        "start_km": 2.2,
        "end_km": 5.6,
        "length_km": 3.4,
        "speed_limit_kmh": 75,
        "track_count": 4,
        "description": "Carriage Works & Loco Works junction sector connecting North & West lines",
    },
    {
        "block_id": "B3",
        "name": "Perambur (PER) → Ambattur (ABU)",
        "from_station": "PER",
        "to_station": "ABU",
        "start_km": 5.6,
        "end_km": 15.0,
        "length_km": 9.4,
        "speed_limit_kmh": 100,
        "track_count": 4,
        "description": "Mid-suburban industrial trunk corridor (Villivakkam, Korattur, Ambattur)",
    },
    {
        "block_id": "B4",
        "name": "Ambattur (ABU) → Avadi (AVD)",
        "from_station": "ABU",
        "to_station": "AVD",
        "start_km": 15.0,
        "end_km": 21.4,
        "length_km": 6.4,
        "speed_limit_kmh": 105,
        "track_count": 4,
        "description": "Suburban trunk connecting Thirumullaivoyal, Annanur to Avadi EMU terminal",
    },
    {
        "block_id": "B5",
        "name": "Avadi (AVD) → Tiruvallur (TRL)",
        "from_station": "AVD",
        "to_station": "TRL",
        "start_km": 21.4,
        "end_km": 41.8,
        "length_km": 20.4,
        "speed_limit_kmh": 110,
        "track_count": 4,
        "description": "Outer suburban express trunk extending to Tiruvallur & Arakkonam gateway",
    },
]

# Explicit user-activated demonstration dataset ONLY (Never used in Live Mode)
USER_SIMULATED_TRAINS = [
    {
        "train_number": "12601",
        "train_name": "Mangalore Mail",
        "type": "SUPERFAST_EXPRESS",
        "source": "MAS",
        "destination": "MAQ",
        "direction": "DOWN",
        "assigned_block": "B1",
        "current_station": "MAS",
        "previous_station": "MAS",
        "next_station": "BBQ",
        "segment_progress": 0.45,
        "speed_kmh": 38,
        "delay_minutes": 0,
        "running_status": "ON_TIME",
        "cancellation_status": "NORMAL",
        "diversion_status": "NORMAL",
    },
    {
        "train_number": "43003",
        "train_name": "Chennai Central - Tiruvallur EMU",
        "type": "SUBURBAN_LOCAL",
        "source": "MMC",
        "destination": "TRL",
        "direction": "DOWN",
        "assigned_block": "B2",
        "current_station": "VJM",
        "previous_station": "BBQ",
        "next_station": "PER",
        "segment_progress": 0.65,
        "speed_kmh": 62,
        "delay_minutes": 3,
        "running_status": "RUNNING",
        "cancellation_status": "NORMAL",
        "diversion_status": "NORMAL",
    },
    {
        "train_number": "12675",
        "train_name": "Kovai Superfast Express",
        "type": "SUPERFAST_EXPRESS",
        "source": "MAS",
        "destination": "CBE",
        "direction": "DOWN",
        "assigned_block": "B3",
        "current_station": "VLK",
        "previous_station": "PER",
        "next_station": "ABU",
        "segment_progress": 0.40,
        "speed_kmh": 88,
        "delay_minutes": 0,
        "running_status": "ON_TIME",
        "cancellation_status": "NORMAL",
        "diversion_status": "NORMAL",
    },
    {
        "train_number": "43006",
        "train_name": "Tiruvallur - Chennai Central EMU",
        "type": "SUBURBAN_LOCAL",
        "source": "TRL",
        "destination": "MMC",
        "direction": "UP",
        "assigned_block": "B4",
        "current_station": "ANNR",
        "previous_station": "AVD",
        "next_station": "ABU",
        "segment_progress": 0.55,
        "speed_kmh": 70,
        "delay_minutes": 5,
        "running_status": "RUNNING",
        "cancellation_status": "NORMAL",
        "diversion_status": "NORMAL",
    },
    {
        "train_number": "20607",
        "train_name": "Mysuru Vande Bharat Express",
        "type": "VANDE_BHARAT",
        "source": "MAS",
        "destination": "MYS",
        "direction": "DOWN",
        "assigned_block": "B5",
        "current_station": "TI",
        "previous_station": "AVD",
        "next_station": "TRL",
        "segment_progress": 0.72,
        "speed_kmh": 110,
        "delay_minutes": 0,
        "running_status": "ON_TIME",
        "cancellation_status": "NORMAL",
        "diversion_status": "NORMAL",
    },
]


class RailRadarProvider:
    """
    Live Train Data Provider for the RailRadar API:
    https://railradar.in/docs/live-train-status
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: int = 5,
    ):
        self.base_url = (
            base_url
            or os.environ.get("RAILRADAR_API_BASE_URL")
            or os.environ.get("TRAIN_API_BASE_URL")
            or "https://api.railradar.in/v1"
        ).rstrip("/")
        self.api_key = (
            api_key
            or os.environ.get("RAILRADAR_API_KEY")
            or os.environ.get("TRAIN_API_KEY", "")
        ).strip()
        self.timeout = timeout
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._cache_ttl = int(os.environ.get("LIVE_DATA_REFRESH_INTERVAL", "60"))
        self._rate_limit_until: float = 0.0
        self.requests_this_session: int = 0

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/json",
            "User-Agent": "RailSync-Operations/2.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            headers["X-API-KEY"] = self.api_key
        return headers

    def _http_get(self, endpoint: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Executes HTTP GET request to RailRadar API with caching and rate-limit backoff.
        Returns tuple: (data, error_info)
        """
        # Reload API key dynamically if set in environment
        current_key = (
            os.environ.get("RAILRADAR_API_KEY")
            or os.environ.get("TRAIN_API_KEY")
            or self.api_key
        ).strip()
        
        if current_key:
            self.api_key = current_key

        if not self.api_key:
            error_info = {
                "api_status": "NO_API_KEY",
                "status_code": 401,
                "message": "Live RailRadar data unavailable. RAILRADAR_API_KEY is not configured.",
            }
            return None, error_info

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        now = time.time()

        # Check rate-limit backoff window
        if now < self._rate_limit_until:
            if url in self._cache:
                _, val = self._cache[url]
                return val, None
            return None, {
                "api_status": "RATE_LIMITED",
                "status_code": 429,
                "message": "Live RailRadar API rate limit active. Backing off request to prevent HTTP 429.",
            }

        # Check cache freshness
        if url in self._cache:
            ts, val = self._cache[url]
            if now - ts < self._cache_ttl:
                return val, None

        req = urllib.request.Request(url, headers=self._get_headers())
        self.requests_this_session += 1
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                status_code = resp.status
                print(f"[RailRadar API] GET {url} -> HTTP {status_code} OK")
                if status_code == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    self._cache[url] = (now, data)
                    return data, None
        except urllib.error.HTTPError as e:
            status_code = e.code
            print(f"[RailRadar API] GET {url} -> HTTP {status_code} Error")
            if status_code == 429:
                self._rate_limit_until = now + 90.0  # Back off for 90 seconds
                msg = "Live RailRadar data temporarily rate-limited (HTTP 429). Applied 90s backoff."
                st = "RATE_LIMITED"
                if url in self._cache:
                    _, val = self._cache[url]
                    return val, None
                return None, {"api_status": st, "status_code": 429, "message": msg}
            elif status_code == 401:
                msg = "Live RailRadar data unavailable. API authentication failed."
                st = "UNAUTHORIZED"
            elif status_code == 403:
                msg = "Live RailRadar data unavailable. Access to this API endpoint is not available."
                st = "FORBIDDEN"
            elif status_code == 404:
                msg = "Live RailRadar data unavailable. The requested train or station could not be found."
                st = "NOT_FOUND"
            elif status_code in [500, 502, 503, 504]:
                msg = "Live RailRadar data is temporarily unavailable."
                st = "SERVICE_UNAVAILABLE"
            else:
                msg = f"Live RailRadar API returned HTTP error status {status_code}."
                st = "API_ERROR"
            return None, {"api_status": st, "status_code": status_code, "message": msg}
        except (urllib.error.URLError, TimeoutError, Exception) as e:
            print(f"[RailRadar API] GET {url} -> Network/Connection Error ({e})")
            return None, {
                "api_status": "NETWORK_ERROR",
                "status_code": 0,
                "message": "Unable to connect to the live train data service.",
            }

        return None, {
            "api_status": "UNKNOWN_ERROR",
            "status_code": 500,
            "message": "Live RailRadar data is temporarily unavailable.",
        }

    def get_live_train(self, train_number: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        return self._http_get(f"/trains/{train_number}/live")

    def get_station_board(self, station_code: str, hours: int = 4) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        return self._http_get(f"/stations/{station_code}/live?hours={hours}")

    def discover_corridor_trains(self, station_codes: List[str]) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        found_trains: Dict[str, Dict[str, Any]] = {}
        last_error = None

        for code in station_codes:
            board, err = self.get_station_board(code, hours=4)
            if err:
                last_error = err
                if err.get("status_code") == 429 or err.get("api_status") == "RATE_LIMITED":
                    # Break early on rate limiting to avoid hammering other station endpoints
                    break
                continue
            if not board:
                continue

            train_items = board.get("trains") or board.get("data") or []
            if isinstance(train_items, list):
                for item in train_items:
                    t_no = str(item.get("train_number") or item.get("number") or "")
                    if t_no and t_no not in found_trains:
                        found_trains[t_no] = item

        return list(found_trains.values()), last_error


class CorridorOperationsEngine:
    """
    Train-to-Block Mapping, Congestion Evaluation, Emergency Halt,
    and Dynamic Operational State Engine.
    """

    def __init__(self):
        self.provider = RailRadarProvider()
        self.simulation_mode = False  # False: Live Mode (default); True: Explicit user simulation mode
        self.live_polling_enabled = False  # Strict rule: LIVE DATA PAUSED by default on startup
        self.live_status = "LIVE DATA PAUSED – Showing last received data."
        self.last_live_success_time: Optional[str] = None
        self.last_successful_live_trains: List[Dict[str, Any]] = []
        self.last_data_source: str = "LIVE DATA PAUSED"

        # In-memory emergency closure state
        self.emergency_closures: Dict[str, Dict[str, Any]] = {}
        self.emergency_logs: List[Dict[str, Any]] = []

        # In-memory active maintenance on blocks
        self.active_maintenance_blocks: Dict[str, Dict[str, Any]] = {}

    def start_live_polling(self) -> Dict[str, Any]:
        self.live_polling_enabled = True
        self.live_status = "LIVE DATA ACTIVE"
        return self.evaluate_corridor_state(force_refresh=True)

    def pause_live_polling(self) -> Dict[str, Any]:
        self.live_polling_enabled = False
        self.live_status = "LIVE DATA PAUSED – Showing last received data."
        return self.evaluate_corridor_state(force_refresh=False)

    def stop_live_polling(self) -> Dict[str, Any]:
        self.live_polling_enabled = False
        self.live_status = "LIVE DATA STOPPED"
        return self.evaluate_corridor_state(force_refresh=False)

    def refresh_live_now(self) -> Dict[str, Any]:
        return self.evaluate_corridor_state(force_refresh=True)

    def set_simulation_mode(self, enabled: bool) -> bool:
        self.simulation_mode = enabled
        if not enabled:
            # When switching back to Live Mode: clear simulation state & reset cache
            self.provider._cache.clear()
        return self.simulation_mode

    def get_station_km(self, code: str) -> Optional[float]:
        c_upper = code.upper()
        for s in CORRIDOR_STATIONS:
            if s["code"] == c_upper:
                return s["km"]

        suburban_map = {
            "MMC": 0.0,
            "VJM": 3.8,
            "PER": 5.6,
            "PCW": 6.8,
            "PEW": 8.0,
            "VLK": 9.4,
            "KOTR": 12.0,
            "PVM": 13.8,
            "ABU": 15.0,
            "TMVL": 17.2,
            "ANNR": 18.4,
            "AVD": 21.4,
            "HC": 23.8,
            "PAB": 25.4,
            "NEC": 27.2,
            "TI": 29.0,
            "VEP": 32.2,
            "SVR": 35.8,
            "PTLR": 38.6,
            "TRL": 41.8,
        }
        return suburban_map.get(c_upper)

    def map_train_to_block(self, train_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Maps a single train into B1..B5 based on station codes and segment progress.
        Returns mapped train object or None if outside corridor.
        """
        t_no = str(train_data.get("train_number") or train_data.get("number") or "")
        t_name = str(train_data.get("train_name") or train_data.get("name") or f"Train {t_no}")
        prev_stn = str(train_data.get("previous_station") or train_data.get("prev_station") or "").upper()
        next_stn = str(train_data.get("next_station") or "").upper()
        curr_stn = str(train_data.get("current_station") or "").upper()
        assigned_blk = train_data.get("assigned_block")

        speed = int(train_data.get("speed") or train_data.get("speed_kmh") or 0)
        delay = int(train_data.get("delay_minutes") or train_data.get("delay") or 0)
        status = str(train_data.get("running_status") or "RUNNING")
        progress = float(train_data.get("segment_progress") or 0.5)

        if assigned_blk in ["B1", "B2", "B3", "B4", "B5"]:
            matched_block = assigned_blk
            direction = train_data.get("direction", "DOWN")
        else:
            km_prev = self.get_station_km(prev_stn)
            km_next = self.get_station_km(next_stn)
            km_curr = self.get_station_km(curr_stn)

            if km_curr is not None:
                est_km = km_curr
            elif km_prev is not None and km_next is not None:
                est_km = km_prev + (km_next - km_prev) * progress
            elif km_prev is not None:
                est_km = km_prev
            elif km_next is not None:
                est_km = km_next
            else:
                return None

            if km_prev is not None and km_next is not None:
                direction = "DOWN" if km_next >= km_prev else "UP"
            else:
                direction = "DOWN"

            if est_km < 0.0 or est_km > 42.0:
                return None

            if est_km <= 2.2:
                matched_block = "B1"
            elif est_km <= 5.6:
                matched_block = "B2"
            elif est_km <= 15.0:
                matched_block = "B3"
            elif est_km <= 21.4:
                matched_block = "B4"
            else:
                matched_block = "B5"

        block_def = next((b for b in CORRIDOR_BLOCKS_DEF if b["block_id"] == matched_block), None)
        if not block_def:
            return None

        return {
            "train_number": t_no,
            "train_name": t_name,
            "type": train_data.get("type", "EXPRESS"),
            "current_block": matched_block,
            "direction": direction,
            "current_station": curr_stn or prev_stn or "EN_ROUTE",
            "previous_station": prev_stn or "DEPARTED",
            "next_station": next_stn or "APPROACHING",
            "segment_progress": round(progress, 2),
            "speed_kmh": speed,
            "delay_minutes": delay,
            "running_status": status,
            "cancellation_status": train_data.get("cancellation_status", "NORMAL"),
            "diversion_status": train_data.get("diversion_status", "NORMAL"),
            "is_simulation": bool(train_data.get("is_simulation", self.simulation_mode)),
            "last_updated": datetime.datetime.now().isoformat(),
        }

    def fetch_live_or_simulated_trains(self, force_refresh: bool = False) -> Tuple[List[Dict[str, Any]], str, str, str, Optional[str]]:
        """
        Pure Data Flow with Manual Live Data Control:
        1. Explicit Simulation Mode: returns simulated trains.
        2. Live Mode:
           - If live_polling_enabled is False AND force_refresh is False:
             - Do NOT make outbound RailRadar requests.
             - If cached live data exists: return (cached_trains, "CACHED", "PAUSED", self.live_status, None)
             - Otherwise: return ([], "PAUSED", "PAUSED", self.live_status, "Live data polling is paused.")
           - If live_polling_enabled is True OR force_refresh is True:
             - Execute outbound RailRadar live API discovery and detail calls.
             - On SUCCESS: cache mapped trains and update last_live_success_time.
        """
        # Case 1: User explicitly enabled Simulation Mode
        if self.simulation_mode:
            mapped = []
            for t in USER_SIMULATED_TRAINS:
                m = self.map_train_to_block(dict(t, is_simulation=True))
                if m:
                    mapped.append(m)
            return (
                mapped,
                "SIMULATION",
                "SIMULATION_ACTIVE",
                "SIMULATION MODE – GENERATED DEMONSTRATION DATA",
                None,
            )

        # Case 2: Live Data Polling is PAUSED/STOPPED and not force_refresh
        if not self.live_polling_enabled and not force_refresh:
            if self.last_live_success_time and len(self.last_successful_live_trains) > 0:
                return (
                    self.last_successful_live_trains,
                    "CACHED",
                    "PAUSED",
                    self.live_status,
                    None,
                )
            return (
                [],
                "PAUSED",
                "PAUSED",
                self.live_status,
                "Live API polling is paused. Click START LIVE DATA or REFRESH NOW to fetch data.",
            )

        # Case 3: Live Mode Active or Force Refresh requested
        discovered, err = self.provider.discover_corridor_trains(["MAS", "BBQ", "PER", "ABU", "AVD", "TRL"])

        if discovered and len(discovered) > 0:
            mapped_live = []
            for item in discovered[:15]:
                t_no = str(item.get("train_number") or item.get("number") or "")
                if not t_no:
                    continue
                live_detail, _ = self.provider.get_live_train(t_no)
                data_to_map = live_detail.get("train") if (live_detail and "train" in live_detail) else (live_detail or item)
                mapped_obj = self.map_train_to_block(data_to_map)
                if mapped_obj:
                    mapped_live.append(mapped_obj)

            self.last_live_success_time = datetime.datetime.now().isoformat()
            self.last_successful_live_trains = mapped_live
            self.last_data_source = "RailRadar Indian Railways Live Stream"
            return (
                mapped_live,
                "LIVE",
                "SUCCESS",
                self.last_data_source,
                None,
            )

        # If discovery returned no items or error:
        if err:
            api_status = err.get("api_status", "SERVICE_UNAVAILABLE")
            err_msg = err.get("message", "Live RailRadar data is temporarily unavailable.")
        else:
            api_status = "SUCCESS"
            err_msg = None

        # Check if cached data from a prior successful live update exists
        if self.last_live_success_time and len(self.last_successful_live_trains) > 0:
            ds = f"LIVE DATA TEMPORARILY UNAVAILABLE – Showing last successful live update from: {self.last_live_success_time}"
            return (
                self.last_successful_live_trains,
                "CACHED",
                api_status,
                ds,
                err_msg,
            )

        # NO Fallback to Demo Data in Live Mode!
        ds = "LIVE DATA UNAVAILABLE"
        return (
            [],  # Strict rule: ZERO mock trains in Live Mode on failure!
            "ERROR",
            api_status,
            ds,
            err_msg or "Live data unavailable: unable to connect to RailRadar API.",
        )

    def evaluate_corridor_state(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Computes the unified operational state across B1..B5.
        """
        active_trains, mode, api_status, data_source, error_msg = self.fetch_live_or_simulated_trains(force_refresh=force_refresh)

        block_trains_map: Dict[str, List[Dict[str, Any]]] = {
            "B1": [], "B2": [], "B3": [], "B4": [], "B5": []
        }
        for t in active_trains:
            b_id = t["current_block"]
            if b_id in block_trains_map:
                block_trains_map[b_id].append(t)

        blocks_result = []
        for idx, b_def in enumerate(CORRIDOR_BLOCKS_DEF):
            b_id = b_def["block_id"]
            trains_in_b = block_trains_map[b_id]
            is_emergency = b_id in self.emergency_closures
            is_reserved = b_id in self.active_maintenance_blocks

            conflict_detected = False
            conflict_details = None

            if is_emergency:
                status = "EMERGENCY_CLOSED"
                emg_info = self.emergency_closures[b_id]
                conflict_detected = True
                conflict_details = {
                    "level": "CRITICAL",
                    "type": emg_info.get("emergency_type", "EMERGENCY_CLOSURE"),
                    "department": emg_info.get("department", "OPERATIONS"),
                    "severity": emg_info.get("severity", 5),
                    "description": emg_info.get("description", "Track lockout active"),
                    "affected_trains": [t["train_number"] for t in trains_in_b],
                }
            elif is_reserved:
                status = "RESERVED"
                maint_info = self.active_maintenance_blocks[b_id]
                conflict_details = {
                    "level": "SCHEDULED",
                    "type": "MAINTENANCE_POSSESSION",
                    "department": maint_info.get("department", "TMS"),
                    "work_type": maint_info.get("work_type", "Track inspection"),
                }
            elif len(trains_in_b) > 1:
                status = "CONGESTED"
                conflict_detected = True
                conflict_details = {
                    "level": "HIGH",
                    "type": "HEADWAY_COMPRESSION",
                    "conflicting_trains": [f"{t['train_number']} ({t['train_name']})" for t in trains_in_b],
                    "message": f"Multiple movements ({len(trains_in_b)} trains) detected within {b_def['name']}.",
                }
            elif len(trains_in_b) == 1:
                status = "OCCUPIED"
            else:
                status = "AVAILABLE"

            if status == "EMERGENCY_CLOSED":
                signal_aspect = "RED"
            elif status in ["CONGESTED", "RESERVED"]:
                signal_aspect = "YELLOW"
            elif status == "OCCUPIED":
                signal_aspect = "YELLOW"
            else:
                signal_aspect = "GREEN"

            enriched_trains = []
            for t in trains_in_b:
                t_copy = dict(t)
                t_copy["id"] = str(t.get("train_number"))
                t_copy["trainNumber"] = str(t.get("train_number"))
                t_copy["trainName"] = str(t.get("train_name"))
                t_copy["assigned_block_id"] = t.get("current_block") or b_id
                t_copy["assigned_block"] = t.get("current_block") or b_id
                t_copy["currentBlockId"] = t.get("current_block") or b_id
                t_copy["currentStationId"] = t.get("current_station") or t.get("previous_station")
                t_copy["progress"] = float(t.get("segment_progress", 0.5))
                t_copy["relative_progress"] = float(t.get("segment_progress", 0.5))
                t_copy["speed"] = float(t.get("speed_kmh", 0))
                t_copy["status"] = t.get("running_status") or t.get("status", "RUNNING")
                enriched_trains.append(t_copy)

            blocks_result.append({
                **b_def,
                "id": b_id,
                "sequence": idx + 1,
                "startStationId": b_def.get("from_station"),
                "endStationId": b_def.get("to_station"),
                "status": status,
                "operational_status": status,
                "signal_aspect": signal_aspect,
                "from_code": b_def.get("from_station"),
                "to_code": b_def.get("to_station"),
                "line_type": "Quadruple Trunk Electrified (25kV AC)" if b_id in ["B1", "B2", "B3"] else "Double Trunk Electrified (25kV AC)",
                "max_speed_kmh": b_def.get("speed_limit_kmh", 110),
                "trains": enriched_trains,
                "active_trains": enriched_trains,
                "active_train_count": len(enriched_trains),
                "occupancy_count": len(enriched_trains),
                "is_emergency_closed": is_emergency,
                "emergency_details": self.emergency_closures.get(b_id),
                "conflict_detected": conflict_detected,
                "conflict_details": conflict_details,
                "active_maintenance": self.active_maintenance_blocks.get(b_id),
            })

        enriched_active_trains = []
        for t in active_trains:
            t_copy = dict(t)
            t_copy["id"] = str(t.get("train_number"))
            t_copy["trainNumber"] = str(t.get("train_number"))
            t_copy["trainName"] = str(t.get("train_name"))
            t_copy["assigned_block_id"] = t.get("current_block") or "B1"
            t_copy["assigned_block"] = t.get("current_block") or "B1"
            t_copy["currentBlockId"] = t.get("current_block") or "B1"
            t_copy["currentStationId"] = t.get("current_station") or t.get("previous_station")
            t_copy["progress"] = float(t.get("segment_progress", 0.5))
            t_copy["relative_progress"] = float(t.get("segment_progress", 0.5))
            t_copy["speed"] = float(t.get("speed_kmh", 0))
            t_copy["status"] = t.get("running_status") or t.get("status", "RUNNING")
            enriched_active_trains.append(t_copy)

        stations_output = [
            {
                "id": str(s.get("id") or s.get("code")),
                "name": str(s.get("name")),
                "code": str(s.get("code")),
                "sequence": int(s.get("sequence", idx + 1)),
                "km": float(s.get("km", 0.0)),
                "is_terminal": bool(s.get("is_terminal", False)),
            }
            for idx, s in enumerate(CORRIDOR_STATIONS)
        ]

        return {
            "corridorId": "MAS-TRL-05",
            "corridorName": CORRIDOR_TITLE,
            "corridor_title": CORRIDOR_TITLE,
            "corridor_code": "MAS-TRL-05",
            "section": "Chennai Central – Tiruvallur Quadruple Trunk",
            "prototype_disclaimer": CORRIDOR_DISCLAIMER,
            "mode": mode,  # "LIVE", "CACHED", "SIMULATION", "PAUSED", or "ERROR"
            "api_status": api_status,
            "live_status": self.live_status,
            "polling_enabled": self.live_polling_enabled,
            "requests_this_session": self.provider.requests_this_session,
            "next_refresh": "Every 10s" if self.live_polling_enabled else "Not scheduled",
            "error_message": error_msg,
            "data_source": data_source,
            "last_updated": datetime.datetime.now().isoformat(),
            "last_live_success_time": self.last_live_success_time,
            "blocks": blocks_result,
            "stations": stations_output,
            "trains": enriched_active_trains,
            "active_trains": enriched_active_trains,
            "total_active_trains": len(enriched_active_trains),
            "active_emergency_count": len(self.emergency_closures),
            "emergency_closures": list(self.emergency_closures.values()),
        }

    def trigger_emergency_halt(
        self,
        block_id: str,
        department: str,
        emergency_type: str,
        severity: int,
        description: str,
        controller_id: str = "CONTROLLER_MAS_01",
    ) -> Dict[str, Any]:
        """
        Functional Emergency Halt Execution:
        1. Sets selected block to EMERGENCY_CLOSED
        2. Identifies trains inside or approaching that block
        3. Prevents new operational or maintenance blocks
        4. Generates emergency log entry
        """
        b_upper = block_id.upper()
        if b_upper not in ["B1", "B2", "B3", "B4", "B5"]:
            raise ValueError(f"Invalid block identifier '{block_id}'. Must be B1, B2, B3, B4, or B5.")

        now_str = datetime.datetime.now().isoformat()
        b_def = next((b for b in CORRIDOR_BLOCKS_DEF if b["block_id"] == b_upper), None)
        b_name = b_def["name"] if b_def else b_upper

        corridor_state = self.evaluate_corridor_state()
        affected_trains = []
        for b in corridor_state["blocks"]:
            if b["block_id"] == b_upper:
                affected_trains = [t["train_number"] for t in b["trains"]]

        closure_record = {
            "emergency_id": f"EMG-{int(time.time())}",
            "block_id": b_upper,
            "block_name": b_name,
            "department": department.upper(),
            "emergency_type": emergency_type,
            "severity": severity,
            "description": description,
            "controller_id": controller_id,
            "timestamp": now_str,
            "status": "ACTIVE",
            "affected_trains": affected_trains,
            "disclaimer": EMERGENCY_DISCLAIMER,
        }

        self.emergency_closures[b_upper] = closure_record
        self.emergency_logs.insert(0, closure_record)

        if b_upper in self.active_maintenance_blocks:
            del self.active_maintenance_blocks[b_upper]

        dispatch_advice = (
            f"EMERGENCY ORDER: Block {b_upper} ({b_name}) locked out. "
            f"Set Signal Aspects to RED for approaching movements. "
            f"Trains affected: {', '.join(affected_trains) if affected_trains else 'None currently inside block'}. "
            f"Regulate trains at previous interlockings with 15-minute headway holding buffer."
        )

        return {
            "success": True,
            "message": f"Block {b_upper} set to EMERGENCY_CLOSED",
            "emergency_record": closure_record,
            "dispatch_advice": dispatch_advice,
            "updated_corridor_state": self.evaluate_corridor_state(),
        }

    def resolve_emergency(self, block_id: str, resolution_notes: str = "Inspection complete. Track certified safe.") -> Dict[str, Any]:
        """
        Clears emergency lockout for a block and records resolution log.
        """
        b_upper = block_id.upper()
        if b_upper in self.emergency_closures:
            rec = self.emergency_closures.pop(b_upper)
            rec["status"] = "RESOLVED"
            rec["resolved_at"] = datetime.datetime.now().isoformat()
            rec["resolution_notes"] = resolution_notes
            self.emergency_logs.insert(0, {
                "emergency_id": f"RES-{int(time.time())}",
                "block_id": b_upper,
                "action": "EMERGENCY_CLEARED",
                "timestamp": datetime.datetime.now().isoformat(),
                "notes": resolution_notes,
            })
            return {
                "success": True,
                "message": f"Block {b_upper} restored to normal operations.",
                "updated_corridor_state": self.evaluate_corridor_state(),
            }
        return {
            "success": False,
            "message": f"Block {b_upper} does not have an active emergency lockout.",
        }

    def generate_recommendation(
        self,
        maintenance_requests: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generates functional AI/Rule-based Operational Recommendation evaluating live inputs.
        If no live/dynamic operational data exists, returns:
        "Insufficient current operational data to generate a recommendation."
        """
        corridor_state = self.evaluate_corridor_state()
        blocks = corridor_state["blocks"]
        active_trains = corridor_state["active_trains"]
        emergencies = corridor_state["emergency_closures"]
        mode = corridor_state["mode"]

        # Check for insufficient operational data rule
        if mode == "ERROR" or (not active_trains and not maintenance_requests and not emergencies and mode != "SIMULATION"):
            return {
                "title": "North Tamil Nadu Corridor Operational Recommendation",
                "corridor": CORRIDOR_TITLE,
                "engine_type": "RULE_BASED_OPERATIONAL_RECOMMENDATION",
                "generated_at": datetime.datetime.now().isoformat(),
                "insufficient_data": True,
                "sections": {
                    "situation_analysis": "Insufficient current operational data to generate a recommendation.",
                    "conflict_detection": "No current live operational data available.",
                    "recommended_action": "Insufficient current operational data to generate a recommendation.",
                    "reasoning": "Live RailRadar stream is unavailable or returned no active movements.",
                    "expected_impact": "None",
                    "alternative_plan": "Awaiting live operational data connection.",
                },
                "disclaimer": "Insufficient current operational data to generate a recommendation.",
            }

        occupied_blocks = [b for b in blocks if b["status"] == "OCCUPIED"]
        congested_blocks = [b for b in blocks if b["status"] == "CONGESTED"]
        emergency_blocks = [b for b in blocks if b["status"] == "EMERGENCY_CLOSED"]
        available_blocks = [b for b in blocks if b["status"] == "AVAILABLE"]

        delayed_trains = [t for t in active_trains if t.get("delay_minutes", 0) > 0]
        avg_delay = sum(t.get("delay_minutes", 0) for t in delayed_trains) / max(1, len(delayed_trains))

        situation = (
            f"North Tamil Nadu Corridor (Chennai Central – Tiruvallur) operates {len(active_trains)} active trains. "
            f"Current block allocation: {len(occupied_blocks)} occupied, {len(congested_blocks)} congested, "
            f"{len(emergency_blocks)} emergency closed, and {len(available_blocks)} available. "
        )
        if delayed_trains:
            situation += f"{len(delayed_trains)} trains running with cumulative delay (avg: {avg_delay:.1f} mins)."
        else:
            situation += "All movements maintaining nominal timetable headway."

        conflicts = []
        if emergency_blocks:
            for eb in emergency_blocks:
                emg_detail = eb.get("emergency_details", {})
                conflicts.append(
                    f"[CRITICAL LOCKOUT] Block {eb['block_id']} is EMERGENCY_CLOSED ({emg_detail.get('emergency_type', 'Emergency')}). "
                    f"Reported by {emg_detail.get('department', 'OPERATIONS')}."
                )

        if congested_blocks:
            for cb in congested_blocks:
                t_list = [t['train_number'] for t in cb['trains']]
                conflicts.append(
                    f"[CONGESTION] Multiple trains {', '.join(t_list)} simultaneously traversing {cb['name']}."
                )

        if maintenance_requests:
            for req in maintenance_requests[:4]:
                if req.get("status") == "PENDING" and req.get("defect_severity", 1) >= 4:
                    conflicts.append(
                        f"[HIGH SEVERITY DEFECT] Request #{req.get('id')} on {req.get('asset_id')} "
                        f"({req.get('department_code')}) requires urgent block possession."
                    )

        if not conflicts:
            conflict_text = "No active operational conflicts or advisories across blocks B1–B5."
        else:
            conflict_text = "\n• ".join(conflicts)
            conflict_text = f"• {conflict_text}"

        if emergency_blocks:
            emg = emergency_blocks[0]
            rec_action = (
                f"Transmit red aspect hold on approach signals to {emg['block_id']} ({emg['name']}). "
                f"Regulate upstream traffic at adjacent junction. Preempt all routine work orders."
            )
            reasoning = (
                f"Block {emg['block_id']} has active {emg.get('emergency_details', {}).get('emergency_type')} "
                f"severity {emg.get('emergency_details', {}).get('severity', 5)}. Passenger safety takes absolute precedence."
            )
            impact = (
                f"Isolates danger zone in {emg['block_id']}, protects passenger consists, "
                f"holds affected trains with controlled headway."
            )
            alternative = (
                f"Slow-order 15 km/h pilot escort through adjacent loop lines if interlocking allows, "
                f"otherwise complete sectional freeze until track inspection certification."
            )
        elif congested_blocks:
            c_blk = congested_blocks[0]
            rec_action = (
                f"Prioritize express consist through {c_blk['block_id']} while holding suburban local at previous platform loop. "
                f"Enforce 15-minute headway spacing."
            )
            reasoning = (
                f"High passenger density in block {c_blk['block_id']}. Prioritizing express prevents cascading timetable delay."
            )
            impact = "Recovers estimated 8–12 minutes of downstream delay on the Chennai–Tiruvallur trunk."
            alternative = "Allow local EMU to leapfrog at next 4-track junction if line clear is established."
        else:
            rec_action = (
                "Authorize multi-department maintenance bundling in available block B3 or B4 "
                "during the upcoming 90-minute off-peak traffic window."
            )
            reasoning = (
                "Corridor occupancy is currently within safe limits. Co-locating Track tamping "
                "with Signal point inspection avoids multiple separate line closures."
            )
            impact = "Saves 2.5–3.2 block possession hours while safeguarding suburban punctuality."
            alternative = "Defer maintenance to nocturnal window (23:30–03:30 IST) to maximize freight path capacity."

        return {
            "title": "North Tamil Nadu Corridor Operational Recommendation",
            "corridor": CORRIDOR_TITLE,
            "engine_type": "RULE_BASED_OPERATIONAL_RECOMMENDATION",
            "generated_at": datetime.datetime.now().isoformat(),
            "insufficient_data": False,
            "sections": {
                "situation_analysis": situation,
                "conflict_detection": conflict_text,
                "recommended_action": rec_action,
                "reasoning": reasoning,
                "expected_impact": impact,
                "alternative_plan": alternative,
            },
            "disclaimer": (
                "Operational recommendation for authorized railway traffic controllers. "
                "Decision-support advisory only."
            ),
        }


corridor_engine = CorridorOperationsEngine()
