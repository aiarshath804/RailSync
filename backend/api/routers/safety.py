"""
RailSync FastAPI Safety Router.
Exposes safety configurations, evaluation, plan validation, compatibility check,
and demonstration scenarios.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from backend.core.safety_config import SafetyConfig
from backend.services.safety_guardrail_service import SafetyGuardrailService
from backend.services.safety_scenarios import SafetyScenarioRunner
from backend.repository import RailSyncRepository

router = APIRouter(prefix="/safety", tags=["Safety Guardrails"])
repo = RailSyncRepository()


class ManualOverridePayload(BaseModel):
    controller_id: str = "CHIEF_CONTROLLER_01"
    target_type: str = "BLOCK"
    target_id: str = "1"
    original_status: str = "PENDING"
    override_action: str = "APPROVE_DESPITE_WARNING"
    override_reason: str
    risk_assessment: Optional[str] = "Speed restriction imposed on adjacent tracks"


@router.get("/config")
def get_safety_config():
    return SafetyConfig.get_summary()


@router.get("/scenarios")
def get_safety_scenarios():
    return SafetyScenarioRunner.run_all_scenarios()


@router.get("/audit-logs")
def get_safety_audit_logs(limit: int = Query(50, ge=1, le=500)):
    logs = repo.get_safety_audit_logs(limit=limit)
    return {
        "status": "SUCCESS",
        "total_logs": len(logs),
        "audit_logs": logs
    }


@router.get("/evaluated-requests")
def get_safety_evaluated_requests():
    requests = repo.get_all_requests()
    trains = repo.get_all_trains()
    evaluated = SafetyGuardrailService.evaluate_batch_safety(
        requests, train_schedules=trains
    )
    return {
        "status": "SUCCESS",
        "total_requests": len(evaluated),
        "requests": evaluated,
        "disclaimer": SafetyConfig.PROTOTYPE_DISCLAIMER
    }


@router.post("/evaluate")
def evaluate_safety(request_data: Dict[str, Any]):
    trains = repo.get_all_trains()
    all_reqs = repo.get_all_requests()
    eval_res = SafetyGuardrailService.evaluate_request_safety(
        request_data, all_requests=all_reqs, train_schedules=trains
    )
    return {"status": "SUCCESS", "evaluation": eval_res}


@router.post("/check-compatibility")
def check_compatibility(payload: Dict[str, Any]):
    req_a = payload.get("request_a", {})
    req_b = payload.get("request_b", {})
    asset_a = payload.get("asset_a")
    asset_b = payload.get("asset_b")
    compat = SafetyGuardrailService.check_bundle_compatibility(
        req_a, req_b, asset_a=asset_a, asset_b=asset_b
    )
    return {"status": "SUCCESS", "compatibility": compat}


@router.post("/validate-plan")
def validate_plan(payload: Dict[str, Any]):
    blocks = payload.get("blocks", repo.get_all_blocks())
    requests = payload.get("requests", repo.get_all_requests())
    trains = payload.get("train_schedules", repo.get_all_trains())
    assets = repo.get_all_assets()
    val_report = SafetyGuardrailService.validate_optimized_plan(
        blocks, requests, trains, assets=assets
    )
    return {"status": "SUCCESS", "validation_report": val_report}


@router.post("/manual-override")
def record_manual_override(payload: ManualOverridePayload):
    log_id = repo.save_safety_audit_log(
        controller_id=payload.controller_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        original_status=payload.original_status,
        override_action=payload.override_action,
        override_reason=payload.override_reason,
        risk_assessment=payload.risk_assessment
    )
    if payload.target_type == "BLOCK":
        repo.update_block_approval(int(payload.target_id), approve=True)
    return {
        "status": "OVERRIDE_RECORDED",
        "audit_log_id": log_id,
        "message": f"Manual controller override successfully recorded for {payload.target_type} #{payload.target_id}."
    }
