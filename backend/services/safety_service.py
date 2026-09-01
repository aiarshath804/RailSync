"""
RailSync Safety Service Compatibility Wrapper.
Provides backwards-compatible interface while utilizing the authoritative SafetyGuardrailService.
"""

from datetime import datetime
from typing import List, Dict, Any, Tuple
from backend.services.safety_guardrail_service import SafetyGuardrailService
from backend.core.constants import DEFAULT_SAFETY_BUFFER_MINUTES

class SafetyService:
    @staticmethod
    def parse_time(val: Any) -> datetime:
        return SafetyGuardrailService.parse_time(val)

    @classmethod
    def validate_train_headway(
        cls, 
        block_start: datetime, 
        block_end: datetime, 
        trains: List[Dict[str, Any]], 
        buffer_minutes: int = DEFAULT_SAFETY_BUFFER_MINUTES
    ) -> Tuple[bool, List[str]]:
        dummy_block = {
            "id": 1,
            "scheduled_start": block_start.isoformat(),
            "scheduled_end": block_end.isoformat(),
            "allocated_safety_buffer": buffer_minutes,
            "bundled_request_ids": []
        }
        report = SafetyGuardrailService.validate_optimized_plan(
            [dummy_block],
            [],
            trains
        )
        return report["passed"], report["violations"]

    @classmethod
    def evaluate_request_safety(cls, request: Dict[str, Any], all_requests=None, train_schedules=None) -> Dict[str, Any]:
        return SafetyGuardrailService.evaluate_request_safety(request, all_requests=all_requests, train_schedules=train_schedules)

    @classmethod
    def check_bundle_compatibility(cls, req_a: Dict[str, Any], req_b: Dict[str, Any], asset_a=None, asset_b=None) -> Dict[str, Any]:
        return SafetyGuardrailService.check_bundle_compatibility(req_a, req_b, asset_a=asset_a, asset_b=asset_b)

    @classmethod
    def validate_optimized_plan(cls, blocks, all_requests, train_schedules, assets=None) -> Dict[str, Any]:
        return SafetyGuardrailService.validate_optimized_plan(blocks, all_requests, train_schedules, assets=assets)
