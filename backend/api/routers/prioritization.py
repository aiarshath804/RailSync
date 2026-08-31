"""
RailSync FastAPI Prioritization Router.
Authoritative REST endpoints for AI-driven Maintenance Prioritization:
  - GET  /api/v1/prioritization/config
  - GET  /api/v1/prioritization/requests
  - POST /api/v1/prioritization/evaluate
  - POST /api/v1/prioritization/recalculate
  - GET  /api/v1/prioritization/scenarios
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from backend.services.prioritization_service import PrioritizationService
from backend.services.prioritization_scenarios import PrioritizationScenarioRunner
from backend.database.repository import repository

router = APIRouter(prefix="/prioritization", tags=["AI Maintenance Prioritization Engine"])


@router.get("/config")
async def get_prioritization_config() -> Dict[str, Any]:
    """
    Returns authoritative weights, thresholds, safety override rules, and prototype disclaimer.
    """
    return PrioritizationService.get_configuration_summary()


@router.get("/requests")
async def get_prioritized_requests(
    priority_level: Optional[str] = Query(None, description="Filter by priority tier: CRITICAL, HIGH, MEDIUM, LOW"),
    department_code: Optional[str] = Query(None, description="Filter by department: TMS, SMMS, TDMS"),
    corridor_id: Optional[str] = Query(None, description="Filter by corridor"),
    safety_override_only: Optional[bool] = Query(None, description="Filter only safety overrides"),
    limit: int = Query(100, ge=1, le=500)
) -> Dict[str, Any]:
    """
    Returns maintenance requests with authoritative priority, criticality, urgency, and impact scores.
    """
    requests = repository.get_maintenance_requests()

    # If requests need scoring evaluation
    trains = repository.get_train_schedules()
    evaluated_list = []

    for req in requests:
        # Check filters
        if priority_level and req.get("priority_level", "").upper() != priority_level.upper():
            continue
        if department_code and req.get("department_code", "").upper() != department_code.upper():
            continue
        if corridor_id and req.get("corridor_id", "").upper() != corridor_id.upper():
            continue
        if safety_override_only is not None:
            is_override = bool(req.get("safety_override", False))
            if is_override != safety_override_only:
                continue

        # If already scored and has explanation, use it; otherwise evaluate
        req_copy = dict(req)
        if "priority_score" not in req_copy or req_copy.get("priority_score") is None:
            eval_res = PrioritizationService.evaluate_request(req_copy, train_schedules=trains, all_requests=requests)
            req_copy.update({
                "criticality_score": eval_res["criticality_score"],
                "urgency_score": eval_res["urgency_score"],
                "impact_score": eval_res["impact_score"],
                "priority_score": eval_res["priority_score"],
                "priority_level": eval_res["priority_level"],
                "safety_override": eval_res["safety_override"],
                "override_reason": eval_res["override_reason"],
                "scoring_method": eval_res["model_used"],
                "scored_at": eval_res["scored_at"],
                "explanation": eval_res["explanation"]
            })
        else:
            # Ensure explanation dict exists
            meta = req_copy.get("metadata")
            if isinstance(meta, str):
                import json
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            if isinstance(meta, dict) and "explanation" in meta:
                req_copy["explanation"] = meta["explanation"]
            else:
                eval_res = PrioritizationService.evaluate_request(req_copy, train_schedules=trains, all_requests=requests)
                req_copy["explanation"] = eval_res["explanation"]

        evaluated_list.append(req_copy)

    # Sort descending by priority_score, putting safety overrides at the top
    evaluated_list.sort(
        key=lambda x: (
            1 if x.get("safety_override") else 0,
            float(x.get("priority_score", 0))
        ),
        reverse=True
    )

    # Calculate summary tier statistics
    tier_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    safety_overrides_count = 0
    for r in evaluated_list:
        lvl = r.get("priority_level", "MEDIUM").upper()
        if lvl in tier_counts:
            tier_counts[lvl] += 1
        if r.get("safety_override"):
            safety_overrides_count += 1

    return {
        "status": "SUCCESS",
        "total_requests": len(evaluated_list),
        "tier_summary": tier_counts,
        "safety_overrides_count": safety_overrides_count,
        "requests": evaluated_list[:limit]
    }


@router.post("/evaluate")
async def evaluate_single_or_batch(
    payload: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Evaluates one or multiple maintenance requests through the Authoritative Prioritization Service.
    Returns composite score, component breakdown, human-readable explanations, and safety override check.
    """
    trains = repository.get_train_schedules()
    all_reqs = repository.get_maintenance_requests()

    if "requests" in payload and isinstance(payload["requests"], list):
        results = PrioritizationService.evaluate_batch(
            payload["requests"],
            train_schedules=trains,
            all_requests=all_reqs
        )
        return {
            "status": "SUCCESS",
            "evaluated_count": len(results),
            "results": results
        }
    else:
        # Single request evaluation
        req_data = payload.get("request", payload)
        result = PrioritizationService.evaluate_request(
            req_data,
            train_schedules=trains,
            all_requests=all_reqs
        )
        return {
            "status": "SUCCESS",
            "evaluation": result
        }


@router.post("/recalculate")
async def recalculate_all_priorities() -> Dict[str, Any]:
    """
    Triggers an on-demand recalculation of priority scores across all active maintenance requests in SQLite.
    Updates the database records with unified scores, urgency levels, safety overrides, and factor breakdowns.
    """
    requests = repository.get_maintenance_requests()
    trains = repository.get_train_schedules()

    if not requests:
        return {
            "status": "EMPTY",
            "updated_count": 0,
            "message": "No maintenance requests available to recalculate."
        }

    evaluated = PrioritizationService.evaluate_batch(requests, train_schedules=trains, all_requests=requests)
    
    updated_count = 0
    for eval_item in evaluated:
        req_id = eval_item.get("request_id")
        if req_id is not None:
            repository.update_request_prioritization(
                request_id=req_id,
                criticality=eval_item["criticality_score"],
                urgency=eval_item["urgency_score"],
                impact=eval_item["impact_score"],
                priority=eval_item["priority_score"],
                level=eval_item["priority_level"],
                safety_override=eval_item["safety_override"],
                override_reason=eval_item["override_reason"],
                scoring_method=eval_item["model_used"],
                scored_at=eval_item["scored_at"],
                explanation=eval_item["explanation"]
            )
            updated_count += 1

    return {
        "status": "SUCCESS",
        "total_requests": len(requests),
        "updated_count": updated_count,
        "evaluations": evaluated[:25] # Return sample of top evaluations
    }


@router.get("/scenarios")
async def get_demonstration_scenarios() -> Dict[str, Any]:
    """
    Executes and returns the 5 canonical railway test scenarios to verify engine behavior.
    """
    return PrioritizationScenarioRunner.run_all_scenarios()
