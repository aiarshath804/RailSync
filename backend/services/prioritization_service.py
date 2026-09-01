"""
RailSync Authoritative Prioritization Service: Unified, Explainable AI Prioritization Engine.
The SINGLE source of truth for railway maintenance priority scoring across TMS, SMMS, TDMS.

Computes:
  1. Criticality (0-100): Physical defect danger, asset risk, and safety multipliers.
  2. Predictive Urgency (0-100): Deterioration rate, SLA deadline proximity, defect age, repeat occurrence.
  3. Operational Impact (0-100): Live corridor traffic density, train priorities (COA), peak hours, delays.

Final Priority = (0.45 * Criticality) + (0.30 * Urgency) + (0.25 * Operational Impact)
Guarantees deterministic safety overrides for critical hazards (e.g. rail fractures, interlocking faults).
"""

import math
import datetime
from typing import Dict, Any, List, Optional, Tuple

from backend.core.prioritization_config import PrioritizationConfig
from backend.ai_engine import AIRailSyncPrioritizationEngine

# Singleton instance of optional ML model
_ml_engine = AIRailSyncPrioritizationEngine()


class CriticalityEngine:
    """
    Evaluates physical asset failure danger, derailment potential, and safety hazard severity.
    """
    @classmethod
    def evaluate(
        cls, 
        request: Dict[str, Any], 
        repeat_count: int = 0
    ) -> Tuple[float, List[str], bool, Optional[str]]:
        factors: List[str] = []
        severity = int(request.get("defect_severity", 3))
        dept = str(request.get("department_code") or request.get("department") or request.get("source_system") or "TMS").upper()
        defect_type = str(request.get("defect_type", "")).upper()
        work_type = str(request.get("work_type", "")).upper()
        notes = str(request.get("notes") or request.get("description", "")).upper()
        full_text = f"{defect_type} {work_type} {notes}"

        # 1. Base Severity (1-5 scale mapped to 20 - 100 base)
        base_score = float(severity) * 16.0  # Sev 1=16, Sev 2=32, Sev 3=48, Sev 4=64, Sev 5=80
        factors.append(f"Base Severity Tier: Level {severity}/5 (+{base_score:.0f} pts)")

        # 2. Department Weighting
        dept_factor = PrioritizationConfig.DEPARTMENT_BASE_WEIGHTS.get(dept, 1.0)
        dept_bonus = (dept_factor - 1.0) * 25.0
        if dept_bonus > 0:
            base_score += dept_bonus
            factors.append(f"Department Risk Multiplier ({dept}): +{dept_bonus:.1f} pts")

        # 3. Defect Category Risk Matching & Safety Override
        safety_override = False
        override_reason = None
        category_bonus = 0.0

        for rule in PrioritizationConfig.SAFETY_CRITICAL_DEFECTS:
            if any(k in full_text for k in rule["keywords"]):
                category_bonus = max(category_bonus, rule["criticality_bonus"])
                factors.append(f"High-Risk Defect Match [{rule['keywords'][0]}]: +{rule['criticality_bonus']:.0f} pts")
                if rule["mandatory_override"] or severity == 5:
                    safety_override = True
                    override_reason = rule["reason"]
                break

        # Check explicit severity 5 override if not already triggered
        if severity == 5 and not safety_override:
            safety_override = True
            override_reason = "Emergency Level 5 severity defect mandates safety priority"

        base_score += category_bonus

        # 4. Repeat Occurrence on same asset
        if repeat_count > 1:
            repeat_bonus = min(20.0, (repeat_count - 1) * 8.0)
            base_score += repeat_bonus
            factors.append(f"Repeated Asset Defect History ({repeat_count} occurrences): +{repeat_bonus:.0f} pts")

        # Normalize to 0 - 100
        criticality_score = max(5.0, min(100.0, base_score))
        if safety_override and criticality_score < 80.0:
            criticality_score = 85.0
            factors.append("Safety Guardrail Active: Floor elevated to 85.0 for critical safety asset")

        return round(criticality_score, 1), factors, safety_override, override_reason


class PredictiveUrgencyEngine:
    """
    Estimates defect degradation risk over time, SLA deadline proximity, and failure acceleration.
    Note: Prototype hybrid risk model until validated with real historical railway degradation data.
    """
    @classmethod
    def evaluate(
        cls, 
        request: Dict[str, Any], 
        repeat_count: int = 0
    ) -> Tuple[float, List[str], str]:
        factors: List[str] = []
        severity = int(request.get("defect_severity", 3))
        defect_type = str(request.get("defect_type", "")).upper()
        work_type = str(request.get("work_type", "")).upper()
        notes = str(request.get("notes") or request.get("description", "")).upper()
        full_text = f"{defect_type} {work_type} {notes}"

        # 1. Determine Degradation Profile
        if any(k in full_text for k in ["FRACTURE", "WELD BREAK", "INTERLOCKING", "POINT", "AXLE COUNTER", "SNAP"]):
            profile = "FAST"
        elif any(k in full_text for k in ["GEOMETRY", "GAUGE", "TENSION", "WEAR", "CIRCUIT", "SIGNAL"]):
            profile = "MEDIUM"
        else:
            profile = "SLOW"

        growth_rate_per_day = PrioritizationConfig.DEGRADATION_PROFILES.get(profile, 6.0)
        factors.append(f"Degradation Profile: {profile} ({growth_rate_per_day:.1f} pts/day theoretical growth)")

        # 2. Defect Age (Time since reported)
        now = datetime.datetime.now()
        reported_at = request.get("reported_at") or request.get("requested_start_time")
        age_hours = 2.0  # default fallback

        if isinstance(reported_at, str):
            try:
                dt = datetime.datetime.fromisoformat(reported_at.replace("Z", ""))
                age_hours = max(0.5, (now - dt).total_seconds() / 3600.0)
            except Exception:
                age_hours = 4.0
        elif isinstance(reported_at, datetime.datetime):
            age_hours = max(0.5, (now - reported_at).total_seconds() / 3600.0)

        age_days = age_hours / 24.0
        age_risk = min(35.0, age_days * growth_rate_per_day * (1.0 + severity * 0.2))
        factors.append(f"Unresolved Defect Age: {age_hours:.1f} hrs (+{age_risk:.1f} pts)")

        # 3. Base Urgency from Severity
        base_urgency = float(severity) * 12.0  # Sev 1=12, Sev 5=60
        factors.append(f"Base Severity Urgency: Level {severity} (+{base_urgency:.0f} pts)")

        # 4. SLA Deadline Proximity
        due_date = request.get("due_date")
        sla_risk = 0.0
        if due_date:
            try:
                if isinstance(due_date, str):
                    due_dt = datetime.datetime.fromisoformat(due_date.replace("Z", ""))
                else:
                    due_dt = due_date

                hours_until_due = (due_dt - now).total_seconds() / 3600.0
                if hours_until_due < 0:
                    # OVERDUE
                    sla_risk = 35.0
                    factors.append(f"SLA Breach: Overdue by {abs(hours_until_due):.1f} hrs (+35.0 pts)")
                elif hours_until_due <= 12.0:
                    sla_risk = 25.0
                    factors.append(f"SLA Critical: Due in {hours_until_due:.1f} hrs (<12h) (+25.0 pts)")
                elif hours_until_due <= 24.0:
                    sla_risk = 18.0
                    factors.append(f"SLA Imminent: Due in {hours_until_due:.1f} hrs (<24h) (+18.0 pts)")
                elif hours_until_due <= 48.0:
                    sla_risk = 10.0
                    factors.append(f"SLA Approaching: Due in {hours_until_due:.1f} hrs (<48h) (+10.0 pts)")
                else:
                    sla_risk = 3.0
                    factors.append(f"SLA Healthy: Due in {hours_until_due/24.0:.1f} days (+3.0 pts)")
            except Exception:
                sla_risk = 10.0
        else:
            # Default SLA based on severity
            sla_risk = 15.0 if severity >= 4 else 5.0
            factors.append(f"Estimated SLA Horizon based on severity: +{sla_risk:.0f} pts")

        # 5. Repeat Issue Risk Escalation
        repeat_escalation = 0.0
        if repeat_count > 1:
            repeat_escalation = min(15.0, (repeat_count - 1) * 6.0)
            factors.append(f"Repeat Failure Escalation (+{repeat_escalation:.0f} pts)")

        total_urgency = base_urgency + age_risk + sla_risk + repeat_escalation
        urgency_score = max(5.0, min(100.0, total_urgency))

        return round(urgency_score, 1), factors, profile


class OperationalImpactEngine:
    """
    Evaluates train operational disruption risk using live COA timetable and corridor density data.
    """
    @classmethod
    def evaluate(
        cls, 
        request: Dict[str, Any], 
        train_schedules: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[float, List[str]]:
        factors: List[str] = []
        corridor_id = str(request.get("corridor_id") or "NDLS-HWH-01").upper()
        duration_minutes = int(request.get("duration_minutes", 60))
        requested_start = request.get("requested_start_time") or request.get("preferred_start")

        # Parse requested start hour
        start_hour_utc = 8
        if isinstance(requested_start, str):
            try:
                dt = datetime.datetime.fromisoformat(requested_start.replace("Z", ""))
                start_hour_utc = dt.hour
            except Exception:
                pass
        elif isinstance(requested_start, datetime.datetime):
            start_hour_utc = requested_start.hour

        # 1. Filter train schedules belonging to this corridor
        trains = train_schedules or []
        corridor_trains = [t for t in trains if str(t.get("corridor_id", "")).upper() == corridor_id or corridor_id in str(t.get("corridor_id", "")).upper()]

        total_trains = len(corridor_trains)
        rajdhani_count = sum(1 for t in corridor_trains if str(t.get("priority_class", "")).upper() in ["RAJDHANI", "VANDE BHARAT", "SHATABDI"])
        express_count = sum(1 for t in corridor_trains if str(t.get("priority_class", "")).upper() == "EXPRESS")
        freight_count = sum(1 for t in corridor_trains if str(t.get("priority_class", "")).upper() == "FREIGHT")

        # 2. Corridor Traffic Density Score (0 - 45 pts)
        if total_trains >= 10:
            density_score = 45.0
            factors.append(f"Heavy Trunk Traffic ({total_trains} scheduled trains on {corridor_id}): +45.0 pts")
        elif total_trains >= 5:
            density_score = 30.0
            factors.append(f"Moderate Corridor Density ({total_trains} trains on {corridor_id}): +30.0 pts")
        elif total_trains >= 1:
            density_score = 15.0
            factors.append(f"Standard Corridor Traffic ({total_trains} trains on {corridor_id}): +15.0 pts")
        else:
            # Low density or branch line
            density_score = 8.0
            factors.append(f"Lightly Used / Feeder Corridor ({corridor_id}): +8.0 pts")

        # 3. High-Priority Train Presence (0 - 25 pts)
        priority_bonus = 0.0
        if rajdhani_count > 0:
            priority_bonus = min(25.0, rajdhani_count * 10.0)
            factors.append(f"Premium Passenger Impact ({rajdhani_count} Rajdhani/Vande Bharat paths): +{priority_bonus:.0f} pts")
        elif express_count > 0:
            priority_bonus = min(15.0, express_count * 4.0)
            factors.append(f"Express Train Density ({express_count} Express trains): +{priority_bonus:.0f} pts")
        elif freight_count > 0:
            priority_bonus = min(8.0, freight_count * 2.0)
            factors.append(f"Freight Corridor Utilization ({freight_count} Freight rakes): +{priority_bonus:.0f} pts")

        # 4. Peak Operating Period (0 - 15 pts)
        is_peak = start_hour_utc in PrioritizationConfig.PEAK_HOURS_UTC
        peak_bonus = 15.0 if is_peak else 4.0
        if is_peak:
            factors.append("Peak Traffic Window: Scheduled during high-density operational hours (+15.0 pts)")
        else:
            factors.append("Off-Peak Traffic Window: Scheduled during low-headway interval (+4.0 pts)")

        # 5. Required Possession Duration Impact (0 - 15 pts)
        # Longer blocks require wider headway clearing and cause downstream cascading delays
        duration_factor = min(15.0, (duration_minutes / 240.0) * 15.0)
        factors.append(f"Possession Block Duration ({duration_minutes} mins): +{duration_factor:.1f} pts")

        raw_impact = density_score + priority_bonus + peak_bonus + duration_factor
        impact_score = max(5.0, min(100.0, raw_impact))

        return round(impact_score, 1), factors


class PrioritizationService:
    """
    Authoritative RailSync Prioritization Service.
    Consolidates Criticality, Predictive Urgency, and Operational Impact into a single explainable score.
    """

    @classmethod
    def evaluate_request(
        cls,
        request: Dict[str, Any],
        train_schedules: Optional[List[Dict[str, Any]]] = None,
        all_requests: Optional[List[Dict[str, Any]]] = None,
        use_ml_model: bool = False
    ) -> Dict[str, Any]:
        """
        Evaluates a single maintenance request across the three authoritative dimensions.
        Returns a complete, explainable score breakdown with safety guardrail evaluation.
        """
        # Count repeat defects on the same asset across existing requests
        asset_id = request.get("asset_id", "")
        repeat_count = 1
        if all_requests:
            repeat_count = sum(1 for r in all_requests if str(r.get("asset_id", "")).upper() == str(asset_id).upper())
            repeat_count = max(1, repeat_count)

        # 1. Criticality Dimension (0 - 100)
        crit_score, crit_factors, safety_override, override_reason = CriticalityEngine.evaluate(
            request, repeat_count=repeat_count
        )

        # 2. Predictive Urgency Dimension (0 - 100)
        urg_score, urg_factors, degradation_profile = PredictiveUrgencyEngine.evaluate(
            request, repeat_count=repeat_count
        )

        # 3. Operational Impact Dimension (0 - 100)
        imp_score, imp_factors = OperationalImpactEngine.evaluate(
            request, train_schedules=train_schedules
        )

        # 4. Optional ML Hybrid Integration
        model_used = "deterministic_hybrid"
        ml_confidence = None
        if use_ml_model:
            try:
                ml_prob = _ml_engine.compute_criticality(
                    defect_severity=int(request.get("defect_severity", 3)),
                    asset_age=12.5,
                    weather_risk=0.3,
                    historical_delay=15.0,
                    inspection_freq=90
                )
                # Blend 10% ML risk into criticality
                crit_score = round(crit_score * 0.90 + (ml_prob * 100.0) * 0.10, 1)
                crit_factors.append(f"RandomForest ML Risk Indicator (Demo Trained): Probability {ml_prob:.2f}")
                model_used = "random_forest_hybrid"
                ml_confidence = round(ml_prob, 3)
            except Exception:
                model_used = "deterministic_hybrid"

        # 5. Weighted Final Priority Score
        w_c = PrioritizationConfig.WEIGHT_CRITICALITY
        w_u = PrioritizationConfig.WEIGHT_URGENCY
        w_i = PrioritizationConfig.WEIGHT_OPERATIONAL_IMPACT

        final_score = (crit_score * w_c) + (urg_score * w_u) + (imp_score * w_i)

        # 6. Safety Override Protection
        # Safety critical defects must never be diluted into LOW or MEDIUM by low operational impact
        if safety_override:
            if final_score < PrioritizationConfig.THRESHOLD_CRITICAL:
                final_score = max(final_score, 78.5)
            priority_level = "CRITICAL"
        else:
            # Map score to standard threshold tiers
            if final_score >= PrioritizationConfig.THRESHOLD_CRITICAL:
                priority_level = "CRITICAL"
            elif final_score >= PrioritizationConfig.THRESHOLD_HIGH:
                priority_level = "HIGH"
            elif final_score >= PrioritizationConfig.THRESHOLD_MEDIUM:
                priority_level = "MEDIUM"
            else:
                priority_level = "LOW"

        final_score = round(final_score, 1)

        # Concise human-readable summary
        summary = (
            f"Asset {asset_id} scored {final_score}/100 ({priority_level}). "
            f"Criticality: {crit_score}, Urgency: {urg_score}, Operational Impact: {imp_score}."
        )
        if safety_override:
            summary += f" [SAFETY OVERRIDE ACTIVE: {override_reason}]"

        return {
            "criticality_score": crit_score,
            "urgency_score": urg_score,
            "impact_score": imp_score,
            "priority_score": final_score,
            "priority_level": priority_level,
            "safety_override": safety_override,
            "override_reason": override_reason,
            "model_used": model_used,
            "confidence": ml_confidence,
            "explanation": {
                "criticality": {
                    "score": crit_score,
                    "weight": f"{int(w_c * 100)}%",
                    "factors": crit_factors
                },
                "urgency": {
                    "score": urg_score,
                    "weight": f"{int(w_u * 100)}%",
                    "degradation_profile": degradation_profile,
                    "factors": urg_factors
                },
                "impact": {
                    "score": imp_score,
                    "weight": f"{int(w_i * 100)}%",
                    "factors": imp_factors
                },
                "final_priority": {
                    "score": final_score,
                    "level": priority_level,
                    "formula": f"({crit_score} × {w_c}) + ({urg_score} × {w_u}) + ({imp_score} × {w_i})"
                },
                "safety_override": {
                    "is_active": safety_override,
                    "reason": override_reason
                },
                "summary": summary
            },
            "scored_at": datetime.datetime.now().isoformat()
        }

    @classmethod
    def evaluate_batch(
        cls,
        requests: List[Dict[str, Any]],
        train_schedules: Optional[List[Dict[str, Any]]] = None,
        use_ml_model: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Evaluates a batch of maintenance requests and ranks them descending by priority_score.
        """
        evaluated_requests = []
        for req in requests:
            eval_res = cls.evaluate_request(
                req,
                train_schedules=train_schedules,
                all_requests=requests,
                use_ml_model=use_ml_model
            )
            item = dict(req)
            item["criticality_score"] = eval_res["criticality_score"]
            item["urgency_score"] = eval_res["urgency_score"]
            item["impact_score"] = eval_res["impact_score"]
            item["priority_score"] = eval_res["priority_score"]
            item["urgency_level"] = round(eval_res["priority_score"] / 100.0, 4) # normalized for legacy compat
            item["priority_level"] = eval_res["priority_level"]
            item["safety_override"] = eval_res["safety_override"]
            item["override_reason"] = eval_res["override_reason"]
            item["model_used"] = eval_res["model_used"]
            item["explanation"] = eval_res["explanation"]
            item["scored_at"] = eval_res["scored_at"]
            evaluated_requests.append(item)

        # Sort descending by priority score
        evaluated_requests.sort(key=lambda x: (1 if x.get("safety_override") else 0, x.get("priority_score", 0.0)), reverse=True)

        for rank, r in enumerate(evaluated_requests, start=1):
            r["prioritization_rank"] = rank

        return evaluated_requests

    @classmethod
    def get_configuration_summary(cls) -> Dict[str, Any]:
        """
        Returns the centralized prioritization configuration, weights, and rules.
        """
        return PrioritizationConfig.get_summary()
