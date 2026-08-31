from typing import Dict, Any
from backend.database.repository import repository
from backend.services.prioritization_service import PrioritizationService
from backend.adapters.tms_adapter import TMSAdapter
from backend.adapters.smms_adapter import SMMSAdapter
from backend.adapters.tdms_adapter import TDMSAdapter
from backend.adapters.coa_adapter import COAAdapter
from backend.schemas.requests import (
    TMSIngestSchema, 
    SMMSIngestSchema, 
    TDMSIngestSchema, 
    COAIngestSchema,
    IngestResponse
)
from backend.core.event_bus import event_bus

class IngestionService:
    @classmethod
    async def ingest_tms(cls, payload: TMSIngestSchema) -> IngestResponse:
        transformed = TMSAdapter.transform(payload)
        score = PrioritizationService.score_request(transformed)
        transformed["urgency_level"] = score
        
        saved = repository.add_maintenance_request(transformed)
        
        await event_bus.broadcast("maintenance_request_created", {
            "department": "TMS",
            "request_id": saved["id"],
            "asset_id": saved["asset_id"],
            "urgency_score": score
        })
        await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

        return IngestResponse(
            status="SUCCESS",
            request_id=saved["id"],
            ai_criticality_score=score,
            message=f"TMS defect {payload.defect_id} on {payload.track_code} ingested and scored."
        )

    @classmethod
    async def ingest_smms(cls, payload: SMMSIngestSchema) -> IngestResponse:
        transformed = SMMSAdapter.transform(payload)
        score = PrioritizationService.score_request(transformed)
        transformed["urgency_level"] = score
        
        saved = repository.add_maintenance_request(transformed)
        
        await event_bus.broadcast("maintenance_request_created", {
            "department": "SMMS",
            "request_id": saved["id"],
            "asset_id": saved["asset_id"],
            "urgency_score": score
        })
        await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

        return IngestResponse(
            status="SUCCESS",
            request_id=saved["id"],
            ai_criticality_score=score,
            message=f"SMMS fault on {payload.signal_post_id} ingested."
        )

    @classmethod
    async def ingest_tdms(cls, payload: TDMSIngestSchema) -> IngestResponse:
        transformed = TDMSAdapter.transform(payload)
        score = PrioritizationService.score_request(transformed)
        transformed["urgency_level"] = score
        
        saved = repository.add_maintenance_request(transformed)
        
        await event_bus.broadcast("maintenance_request_created", {
            "department": "TDMS",
            "request_id": saved["id"],
            "asset_id": saved["asset_id"],
            "urgency_score": score
        })
        await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

        return IngestResponse(
            status="SUCCESS",
            request_id=saved["id"],
            ai_criticality_score=score,
            message=f"TDMS OHE anomaly on section {payload.section_id} ingested."
        )

    @classmethod
    async def ingest_coa(cls, payload: COAIngestSchema) -> Dict[str, Any]:
        transformed = COAAdapter.transform(payload)
        saved = repository.add_train_schedule(transformed)
        
        await event_bus.broadcast("train_schedule_updated", {
            "train_number": saved["train_number"],
            "name": saved["name"],
            "status": saved["status"]
        })
        await event_bus.broadcast("corridor_state_changed", repository.get_corridor_state())

        return {
            "status": "SUCCESS",
            "train_no": saved["train_number"],
            "message": f"COA schedule update for Train {saved['train_number']} ({saved['name']}) recorded."
        }
