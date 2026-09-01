"""
RailSync Centralized Safety Rules & Guardrail Configuration.
The SINGLE authoritative configuration for railway safety classifications,
emergency response windows, isolation requirements, and multi-department compatibility.

DISCLAIMER:
Safety thresholds, response windows, and compatibility matrices in this prototype
are demonstration configurations and must be validated against approved Indian Railways /
RDSO / Railway Board safety procedures before production deployment.
"""

from enum import Enum
from typing import Dict, List, Any

class SafetyClassificationEnum(str, Enum):
    EMERGENCY = "EMERGENCY"       # Catastrophic failure / immediate derailment hazard (0-2h response)
    MANDATORY = "MANDATORY"       # High-risk safety defect requiring guaranteed schedule before SLA
    CONDITIONAL = "CONDITIONAL"   # Safe only if specific isolations (power block, speed restrictions) are met
    SAFE = "SAFE"                 # Routine maintenance, no specialized isolations or urgent deadlines


class IsolationTypeEnum(str, Enum):
    TRACK_POSSESSION = "TRACK_POSSESSION"                   # Full track closure to rolling stock
    POWER_BLOCK_ISOLATION = "POWER_BLOCK_ISOLATION"         # OHE 25kV traction de-energization & earthing
    ADJACENT_TRACK_PROTECTION = "ADJACENT_TRACK_PROTECTION" # Caution order / speed restriction on adjacent lines
    INTERLOCKING_DISCONNECTION = "INTERLOCKING_DISCONNECTION" # S&T point/signal gear mechanical disconnection


class SafetyConfig:
    PROTOTYPE_DISCLAIMER = (
        "Safety thresholds, response windows, and compatibility matrices in this prototype "
        "are demonstration configurations and must be validated against approved Indian Railways / "
        "RDSO / Railway Board safety procedures before production deployment."
    )

    # Operational safety margins
    DEFAULT_SAFETY_BUFFER_MINUTES = 15
    MAX_BLOCK_DURATION_MINUTES = 240
    SOLVER_TIMEOUT_SECONDS = 5.0
    MAX_SPATIAL_PROXIMITY_KM = 5.0

    # -------------------------------------------------------------
    # 1. EMERGENCY DEFECT DEFINITIONS (Max Response Windows)
    # -------------------------------------------------------------
    EMERGENCY_RULES = [
        {
            "id": "EMG-01",
            "defect_key": "RAIL_FRACTURE",
            "keywords": ["RAIL FRACTURE", "FRACTURE", "BROKEN RAIL", "RAIL BREAK"],
            "departments": ["TMS"],
            "max_response_hours": 2.0,
            "isolation_requirements": [IsolationTypeEnum.TRACK_POSSESSION.value],
            "severity_threshold": 4,
            "description": "Complete structural break in rail section; high derailment risk."
        },
        {
            "id": "EMG-02",
            "defect_key": "TRACK_BUCKLING",
            "keywords": ["BUCKLE", "BUCKLING", "THERMAL DISTORTION", "TRACK HEAVE"],
            "departments": ["TMS"],
            "max_response_hours": 2.0,
            "isolation_requirements": [IsolationTypeEnum.TRACK_POSSESSION.value],
            "severity_threshold": 4,
            "description": "Severe thermal misalignment of continuous welded rail."
        },
        {
            "id": "EMG-03",
            "defect_key": "INTERLOCKING_LOCK_FAILURE",
            "keywords": ["POINT MACHINE LOCK", "INTERLOCKING FAILURE", "FACING POINT BURST", "ROUTE COLLAPSE"],
            "departments": ["SMMS"],
            "max_response_hours": 2.0,
            "isolation_requirements": [IsolationTypeEnum.TRACK_POSSESSION.value, IsolationTypeEnum.INTERLOCKING_DISCONNECTION.value],
            "severity_threshold": 4,
            "description": "Uncontrolled facing point or electronic interlocking signal route failure."
        },
        {
            "id": "EMG-04",
            "defect_key": "CATENARY_PARTING",
            "keywords": ["CATENARY DROP", "CATENARY PARTING", "OHE SNAP", "CONTACT WIRE BREAK", "PANTOGRAPH ENTANGLEMENT"],
            "departments": ["TDMS"],
            "max_response_hours": 2.0,
            "isolation_requirements": [IsolationTypeEnum.TRACK_POSSESSION.value, IsolationTypeEnum.POWER_BLOCK_ISOLATION.value],
            "severity_threshold": 4,
            "description": "Live 25kV OHE wire snap, sag, or pantograph structural entanglement."
        },
        {
            "id": "EMG-05",
            "defect_key": "WELD_FAILURE",
            "keywords": ["WELD FAILURE", "ALUMINOTHERMIC WELD CRACK", "AT WELD BREAK"],
            "departments": ["TMS"],
            "max_response_hours": 3.0,
            "isolation_requirements": [IsolationTypeEnum.TRACK_POSSESSION.value],
            "severity_threshold": 4,
            "description": "Failure or major transverse crack at rail joint weld."
        }
    ]

    # -------------------------------------------------------------
    # 2. MANDATORY DEFECT DEFINITIONS (High Risk, Must Schedule)
    # -------------------------------------------------------------
    MANDATORY_RULES = [
        {
            "id": "MAN-01",
            "defect_key": "TRACK_GEOMETRY_EXCEEDANCE",
            "keywords": ["TRACK GEOMETRY", "GAUGE EXCEEDANCE", "UNEVENNESS", "TWIST", "PEAK ACCELERATION"],
            "departments": ["TMS"],
            "max_response_hours": 12.0,
            "isolation_requirements": [IsolationTypeEnum.TRACK_POSSESSION.value],
            "severity_threshold": 3,
            "description": "Track parameter deviation exceeding RDSO safety tolerance limits."
        },
        {
            "id": "MAN-02",
            "defect_key": "SIGNAL_CIRCUIT_DRIFT",
            "keywords": ["TRACK CIRCUIT DRIFT", "AXLE COUNTER RESET", "SIGNAL BLANKING", "RELAY DRIFT"],
            "departments": ["SMMS"],
            "max_response_hours": 12.0,
            "isolation_requirements": [IsolationTypeEnum.INTERLOCKING_DISCONNECTION.value],
            "severity_threshold": 3,
            "description": "Erratic signal track circuit voltage or intermittent axle counter drop."
        },
        {
            "id": "MAN-03",
            "defect_key": "OHE_HOTSPOT_DEFECT",
            "keywords": ["OHE HOTSPOT", "INSULATOR FLASH", "CONTACT WIRE WEAR", "CANTILEVER CRACK"],
            "departments": ["TDMS"],
            "max_response_hours": 16.0,
            "isolation_requirements": [IsolationTypeEnum.POWER_BLOCK_ISOLATION.value],
            "severity_threshold": 3,
            "description": "Thermal degradation or excessive localized wear on 25kV contact assembly."
        }
    ]

    # -------------------------------------------------------------
    # 3. CONDITIONAL MAINTENANCE DEFINITIONS
    # -------------------------------------------------------------
    CONDITIONAL_RULES = [
        {
            "id": "CON-01",
            "work_key": "OHE_HEAVY_TENSIONING",
            "keywords": ["TENSIONING", "CONTACT WIRE REPLACEMENT", "OHE RECONDUCTORING"],
            "required_isolation": IsolationTypeEnum.POWER_BLOCK_ISOLATION.value,
            "conflict_conditions": ["TRACK_DIESEL_CRANE_ACTIVE", "LIVE_HAULAGE_REQUIRED"],
            "description": "Requires complete de-energization and discharge rod grounding."
        },
        {
            "id": "CON-02",
            "work_key": "TRACK_MACHINE_TAMPING",
            "keywords": ["TAMPING", "BALLAST REGULATION", "DEEP SCREENING", "BCM"],
            "required_isolation": IsolationTypeEnum.ADJACENT_TRACK_PROTECTION.value,
            "conflict_conditions": ["SIMULTANEOUS_ADJACENT_HIGH_SPEED_RUN"],
            "description": "Heavy on-track tamping requires caution order on adjacent line."
        }
    ]

    # -------------------------------------------------------------
    # 4. CROSS-DEPARTMENT COMPATIBILITY & BUNDLING MATRIX
    # -------------------------------------------------------------
    COMPATIBILITY_MATRIX = {
        ("TMS", "TMS"): {
            "status": "COMPATIBLE",
            "condition": "Allowed if spatial location is within 5km and tasks do not require exclusive single-machine track occupancy."
        },
        ("TMS", "SMMS"): {
            "status": "COMPATIBLE",
            "condition": "Joint track-signal maintenance (e.g. insulated joints, point tie bars) is highly encouraged."
        },
        ("TMS", "TDMS"): {
            "status": "CONDITIONAL",
            "condition": "Compatible ONLY if OHE power block status matches track requirements. Incompatible if track work requires electric train moves while OHE is de-energized."
        },
        ("SMMS", "TDMS"): {
            "status": "COMPATIBLE",
            "condition": "Signal & OHE works compatible under standard section possession."
        }
    }

    # Department incompatibility rules for specific work type combinations
    INCOMPATIBLE_COMBINATIONS = [
        {
            "type_a": "LIVE_TRACTION_HAULAGE",
            "type_b": "POWER_BLOCK_ISOLATION",
            "reason": "Electric haulage requires live 25kV traction, directly conflicting with OHE de-energization."
        },
        {
            "type_a": "HEAVY_CRANE_LIFT",
            "type_b": "LIVE_OHE",
            "reason": "Operating heavy cranes under energized 25kV OHE violates railway safety clearance minimums."
        },
        {
            "type_a": "DYNAMIC_SIGNAL_TESTING",
            "type_b": "TRACK_RAIL_REMOVAL",
            "reason": "Signal testing requiring live test train movements cannot occur while rail section is dismantled."
        }
    ]

    @classmethod
    def get_summary(cls) -> Dict[str, Any]:
        return {
            "prototype_disclaimer": cls.PROTOTYPE_DISCLAIMER,
            "safety_classifications": [e.value for e in SafetyClassificationEnum],
            "isolation_types": [e.value for e in IsolationTypeEnum],
            "default_safety_buffer_minutes": cls.DEFAULT_SAFETY_BUFFER_MINUTES,
            "max_block_duration_minutes": cls.MAX_BLOCK_DURATION_MINUTES,
            "emergency_rules_count": len(cls.EMERGENCY_RULES),
            "emergency_rules": cls.EMERGENCY_RULES,
            "mandatory_rules_count": len(cls.MANDATORY_RULES),
            "mandatory_rules": cls.MANDATORY_RULES,
            "conditional_rules_count": len(cls.CONDITIONAL_RULES),
            "compatibility_matrix": {
                f"{k[0]}+{k[1]}": v for k, v in cls.COMPATIBILITY_MATRIX.items()
            }
        }
