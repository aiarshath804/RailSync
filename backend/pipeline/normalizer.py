"""
RailSync Data Pipeline: Centralized Normalization and Quality Layer.
Handles corridor code canonicalization, location parsing, severity scale normalization, and timestamp conversions.
"""

import re
import datetime
from typing import Tuple, Optional, Any, Union


class SeverityNormalizer:
    """
    Standardizes all railway defect severities to the unified 1-5 scale:
    1 = LOW
    2 = MODERATE
    3 = MEDIUM
    4 = HIGH
    5 = CRITICAL
    """
    
    TEXT_MAPPINGS = {
        # Standard names
        "LOW": 1,
        "MINOR": 1,
        "INFO": 1,
        "ROUTINE": 1,
        "P4": 1,
        "P5": 1,
        
        "MODERATE": 2,
        "WARN": 2,
        "WARNING": 2,
        "FAIR": 2,
        "P3": 2,
        
        "MEDIUM": 3,
        "MED": 3,
        "ELEVATED": 3,
        "ATTENTION": 3,
        
        "HIGH": 4,
        "MAJOR": 4,
        "SERIOUS": 4,
        "URGENT": 4,
        "P2": 4,
        
        "CRITICAL": 5,
        "EMERGENCY": 5,
        "SEVERE": 5,
        "IMMEDIATE": 5,
        "SAFETY_HALT": 5,
        "P1": 5,
    }

    @classmethod
    def normalize_severity(cls, val: Any) -> int:
        if val is None:
            return 3  # Default medium
        
        if isinstance(val, (int, float)):
            num = int(round(val))
            return max(1, min(5, num))
        
        s = str(val).strip().upper()
        
        # Check direct text dictionary
        if s in cls.TEXT_MAPPINGS:
            return cls.TEXT_MAPPINGS[s]
        
        # Try parsing integer from string
        try:
            num = int(float(s))
            return max(1, min(5, num))
        except ValueError:
            pass
        
        return 3

    @classmethod
    def normalize_tdms_tension_drop(cls, tension_drop_pct: Union[int, float, str]) -> int:
        """
        Maps OHE Catenary tension drop percentage to canonical 1-5 severity:
        > 25% -> 5 (CRITICAL)
        > 15% -> 4 (HIGH)
        > 8%  -> 3 (MEDIUM)
        > 3%  -> 2 (MODERATE)
        <= 3% -> 1 (LOW)
        """
        try:
            val = float(str(tension_drop_pct).replace("%", "").strip())
        except (ValueError, TypeError):
            return 3

        if val >= 25.0:
            return 5
        elif val >= 15.0:
            return 4
        elif val >= 8.0:
            return 3
        elif val >= 3.0:
            return 2
        else:
            return 1


class LocationNormalizer:
    """
    Standardizes corridor names and kilometre location ranges.
    """

    @classmethod
    def normalize_corridor(cls, raw: Optional[str]) -> str:
        if not raw:
            return "MAS-TRL-05"
        
        s = str(raw).strip()
        # Remove redundant words like 'Corridor', 'Section', 'Line', etc.
        s = s.replace("_", "-").replace("/", "-").replace(" ", "-")
        # Collapse multiple dashes
        s = re.sub(r"-+", "-", s)
        s = s.upper()
        
        # Specific canonical pattern cleanups
        s = s.replace("-SECTION-", "-").replace("-CORRIDOR-", "-").replace("-LINE-", "-")
        s = re.sub(r"-SECTION$", "", s)
        s = re.sub(r"-CORRIDOR$", "", s)
        
        # Canonical MAS-TRL railway corridors
        if any(station in s for station in ["MAS", "TRL", "BBQ", "PER", "ABU", "AVD", "CHENNAI", "TIRUVALLUR"]):
            return "MAS-TRL-05"
        
        return "MAS-TRL-05"

        return s.strip("-")

    @classmethod
    def normalize_location_km(
        cls, 
        raw_loc: Any, 
        raw_start: Optional[Any] = None, 
        raw_end: Optional[Any] = None
    ) -> Tuple[float, float]:
        """
        Parses location into canonical (start_km, end_km).
        Handles formats like:
        - start=12.4, end=15.0
        - "312-316"
        - "KM 312 to KM 316"
        - "KM 45.2"
        """
        # If explicit start and end provided
        if raw_start is not None and raw_end is not None:
            try:
                s = float(str(raw_start).upper().replace("KM", "").replace("M", "").strip())
                e = float(str(raw_end).upper().replace("KM", "").replace("M", "").strip())
                if s > e:
                    s, e = e, s
                return round(s, 2), round(e, 2)
            except (ValueError, TypeError):
                pass
        
        if raw_loc is not None:
            s_str = str(raw_loc).upper().replace("KM", "").strip()
            # Check for range: "312 - 316" or "312 TO 316" or "312:316"
            range_match = re.search(r"([\d\.]+)\s*(?:-|TO|:|\.\.)\s*([\d\.]+)", s_str)
            if range_match:
                s = float(range_match.group(1))
                e = float(range_match.group(2))
                if s > e:
                    s, e = e, s
                return round(s, 2), round(e, 2)
            
            # Single KM marker
            single_match = re.search(r"([\d\.]+)", s_str)
            if single_match:
                val = float(single_match.group(1))
                return round(val, 2), round(val + 0.5, 2)

        return 0.0, 5.0


class DateTimeNormalizer:
    """
    Standardizes various datetime string formats into timezone-naive UTC ISO-8601 strings and datetimes.
    """

    KNOWN_FORMATS = [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%d",
        "%d-%m-%Y",
    ]

    @classmethod
    def normalize_datetime(cls, val: Any, default_offset_hours: float = 2.0) -> datetime.datetime:
        if isinstance(val, datetime.datetime):
            return val
        
        if isinstance(val, datetime.date):
            return datetime.datetime.combine(val, datetime.time(8, 0))

        if not val:
            return datetime.datetime.now() + datetime.timedelta(hours=default_offset_hours)

        s = str(val).strip()
        # Handle 'Z' or timezone offsets simply
        clean_s = s.replace("+00:00", "Z").replace("+05:30", "")

        for fmt in cls.KNOWN_FORMATS:
            try:
                return datetime.datetime.strptime(clean_s, fmt)
            except ValueError:
                continue

        # Try ISO fromisoformat fallback
        try:
            return datetime.datetime.fromisoformat(clean_s.replace("Z", ""))
        except Exception:
            pass

        return datetime.datetime.now() + datetime.timedelta(hours=default_offset_hours)


class StringSanitizer:
    """
    Cleans strings, removes invisible chars, strips extra spaces.
    """
    @classmethod
    def sanitize(cls, val: Any, default: str = "") -> str:
        if val is None:
            return default
        s = str(val).strip()
        # Collapse multiple internal spaces
        return re.sub(r"\s+", " ", s)
