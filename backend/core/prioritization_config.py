"""
RailSync Configuration: Centralized Prioritization & Railway Domain Rules.
Defines scoring weights, priority tier boundaries, degradation rates,
and safety-critical defect categories for Indian Railways operations.
"""

from typing import Dict, Any, List

class PrioritizationConfig:
    """
    Centralized, explainable configuration for RailSync Prioritization Engine.
    All weights sum to 1.0 and all thresholds are explicitly bounded.
    """
    
    # -------------------------------------------------------------
    # 1. Scoring Dimension Weights
    # -------------------------------------------------------------
    WEIGHT_CRITICALITY: float = 0.45
    WEIGHT_URGENCY: float = 0.30
    WEIGHT_OPERATIONAL_IMPACT: float = 0.25

    # -------------------------------------------------------------
    # 2. Priority Level Thresholds (0 - 100)
    # -------------------------------------------------------------
    THRESHOLD_CRITICAL: float = 75.0  # 75 - 100: CRITICAL
    THRESHOLD_HIGH: float = 50.0      # 50 - 74:  HIGH
    THRESHOLD_MEDIUM: float = 25.0    # 25 - 49:  MEDIUM
    # 0 - 24: LOW

    # -------------------------------------------------------------
    # 3. Department Base Risk Multipliers
    # -------------------------------------------------------------
    DEPARTMENT_BASE_WEIGHTS: Dict[str, float] = {
        "TMS": 1.20,   # Track geometry, rail fractures (derailment risk)
        "SMMS": 1.15,  # Signal & interlocking (collision / halt risk)
        "TDMS": 1.05,  # OHE traction & catenary (power trip / delay risk)
        "COA": 1.00,
    }

    # -------------------------------------------------------------
    # 4. Defect Category Risk Multipliers & Safety Critical Flagging
    # -------------------------------------------------------------
    # Keyword patterns matching high-risk conditions
    SAFETY_CRITICAL_DEFECTS: List[Dict[str, Any]] = [
        {
            "keywords": ["RAIL FRACTURE", "FRACTURE", "WELD BREAK", "RAIL CUT", "BROKEN RAIL"],
            "dept": "TMS",
            "criticality_bonus": 35.0,
            "mandatory_override": True,
            "reason": "Rail fracture detected — immediate derailment hazard requires mandatory safety priority"
        },
        {
            "keywords": ["INTERLOCKING", "POINT MACHINE", "POINT FAILURE", "SWITCH FAILURE", "AXLE COUNTER"],
            "dept": "SMMS",
            "criticality_bonus": 30.0,
            "mandatory_override": True,
            "reason": "Interlocking or Point machine failure — risk of route corruption requires mandatory safety priority"
        },
        {
            "keywords": ["CATENARY SAG", "TENSION DROP", "CONTACT WIRE WEAR", "OHE SNAP", "FEEDER FAULT", "PANTOGRAPH ENTANGLEMENT"],
            "dept": "TDMS",
            "criticality_bonus": 25.0,
            "mandatory_override": False,
            "reason": "Severe catenary degradation — risk of pantograph entanglement"
        },
        {
            "keywords": ["TRACK GEOMETRY", "GAUGE WIDENING", "CROSS LEVEL", "TWIST", "UNEVACUATED SINK"],
            "dept": "TMS",
            "criticality_bonus": 25.0,
            "mandatory_override": False,
            "reason": "Significant track geometry deviation exceeding safety tolerance"
        },
        {
            "keywords": ["SIGNAL BLANK", "RED ASPECT FAILURE", "ASPECT BLANK", "LAMP OUT"],
            "dept": "SMMS",
            "criticality_bonus": 25.0,
            "mandatory_override": False,
            "reason": "Signal aspect failure causing train halt at block section"
        }
    ]

    # -------------------------------------------------------------
    # 5. Degradation Profiles (Daily Risk Growth Rate Points/Day)
    # -------------------------------------------------------------
    DEGRADATION_PROFILES: Dict[str, float] = {
        "FAST": 12.0,     # Rapid structural or electrical deterioration (e.g. fracture, interlocking)
        "MEDIUM": 6.0,    # Normal mechanical wear (e.g. track geometry, catenary tension)
        "SLOW": 2.5,      # Routine cosmetic/fastener issues
    }

    # -------------------------------------------------------------
    # 6. Train Priority Operational Impact Weights
    # -------------------------------------------------------------
    TRAIN_PRIORITY_FACTORS: Dict[str, float] = {
        "RAJDHANI": 1.00,  # Premium VIP high-speed passenger
        "VANDE BHARAT": 1.00,
        "SHATABDI": 0.95,
        "EXPRESS": 0.70,   # Superfast / Mail / Express
        "PASSENGER": 0.50, # Ordinary passenger
        "FREIGHT": 0.35,   # Goods / Freight trains
    }

    # Peak hours across Indian Railway trunk routes (07:00-11:00 and 17:00-21:00)
    PEAK_HOURS_UTC: List[int] = [1, 2, 3, 4, 5, 11, 12, 13, 14, 15]

    @classmethod
    def get_summary(cls) -> Dict[str, Any]:
        return {
            "weights": {
                "criticality": cls.WEIGHT_CRITICALITY,
                "urgency": cls.WEIGHT_URGENCY,
                "operational_impact": cls.WEIGHT_OPERATIONAL_IMPACT
            },
            "thresholds": {
                "critical": cls.THRESHOLD_CRITICAL,
                "high": cls.THRESHOLD_HIGH,
                "medium": cls.THRESHOLD_MEDIUM,
                "low": 0.0
            },
            "degradation_profiles": cls.DEGRADATION_PROFILES,
            "disclaimer": "Predictive urgency is a prototype hybrid risk model until validated with real historical railway degradation data."
        }
