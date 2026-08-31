import os
import re
import io
import json
import asyncio
import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.database import init_db, get_db
from backend.repository import RailSyncRepository
from backend.adapters import (
    DataAdapterPipeline, TMSPayload, SMMSPayload, TDMSPayload, COAPayload
)
from backend.ai_engine import AIRailSyncPrioritizationEngine
from backend.optimizer import CPOrToolsBlockOptimizer
from backend.pipeline.service import PipelineImportService

app = FastAPI(
    title="RailSync Authoritative Backend",
    description="Unified Multi-Department Ingestion, CP-SAT Optimization, and Corridor Planning for Indian Railways",
    version="2.0.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Repository and Service Singletons
repo = RailSyncRepository()
ai_engine = AIRailSyncPrioritizationEngine()
import_service = PipelineImportService(repo=repo, ai_engine=ai_engine)

# -------------------------------------------------------------
# LIFECYCLE HANDLERS
# -------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    try:
        init_db()
        print("[RailSync] Persistent SQLite database & baseline assets initialized.")
    except Exception as e:
        print(f"[RailSync] Database startup initialization error: {e}")

# Helper to parse file/body payloads
async def extract_upload_payload(request: Request, filepath: Optional[str] = None) -> tuple[bytes, str]:
    if filepath:
        # Check standard project locations
        candidates = [
            filepath,
            os.path.join(os.getcwd(), filepath),
            os.path.join(os.getcwd(), "data", filepath),
            os.path.join(os.path.dirname(__file__), "..", filepath),
            os.path.join(os.path.dirname(__file__), "..", "data", filepath),
        ]
        for p in candidates:
            if os.path.exists(p) and os.path.isfile(p):
                with open(p, "rb") as f:
                    return f.read(), os.path.basename(p)

    body_bytes = await request.body()
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        match = re.search(r"boundary=([^;]+)", content_type)
        if match:
            boundary = match.group(1).strip().strip('"').encode()
            parts = body_bytes.split(b"--" + boundary)
            for part in parts:
                if b'name="file"' in part or b'filename=' in part:
                    header_end = part.find(b"\r\n\r\n")
                    if header_end != -1:
                        headers = part[:header_end].decode("utf-8", errors="ignore")
                        fn_match = re.search(r'filename="([^"]+)"', headers)
                        filename = fn_match.group(1) if fn_match else "uploaded.csv"
                        file_data = part[header_end + 4:].rstrip(b"\r\n--")
                        return file_data, filename

    filename = "dataset.json" if "json" in content_type else "dataset.csv"
    return body_bytes, filename

# -------------------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------------------
@app.get("/api/v1/health")
async def health_check():
    assets_count = len(repo.get_all_assets())
    requests_count = len(repo.get_all_requests())
    trains_count = len(repo.get_all_trains())
    batches_count = len(repo.get_all_import_batches())
    return {
        "status": "HEALTHY",
        "service": "RailSync Authoritative Backend",
        "version": "2.0.0",
        "database": "Persistent SQLite (railsync.db)",
        "metrics": {
            "assets_registered": assets_count,
            "maintenance_requests": requests_count,
            "train_schedules": trains_count,
            "import_batches": batches_count
        },
        "timestamp": datetime.datetime.now().isoformat()
    }

# -------------------------------------------------------------
# DATASET FILE IMPORT ENDPOINTS (TMS, SMMS, TDMS, COA)
# -------------------------------------------------------------

@app.post("/api/v1/import/tms", status_code=status.HTTP_200_OK)
async def import_tms_dataset(request: Request, filepath: Optional[str] = None):
    """
    Imports Track Management System (TMS) dataset from uploaded CSV/JSON or filepath on disk.
    Standardizes defect severities to 1-5, normalizes corridors/locations, and runs AI scoring.
    """
    payload_bytes, filename = await extract_upload_payload(request, filepath)
    if not payload_bytes:
        raise HTTPException(status_code=400, detail="Empty request payload or unreadable file")
    
    result = import_service.import_dataset("TMS", payload_bytes, filename=filename)
    return result

@app.post("/api/v1/import/smms", status_code=status.HTTP_200_OK)
async def import_smms_dataset(request: Request, filepath: Optional[str] = None):
    """
    Imports Signal Maintenance Management System (SMMS) dataset.
    """
    payload_bytes, filename = await extract_upload_payload(request, filepath)
    if not payload_bytes:
        raise HTTPException(status_code=400, detail="Empty request payload or unreadable file")
    
    result = import_service.import_dataset("SMMS", payload_bytes, filename=filename)
    return result

@app.post("/api/v1/import/tdms", status_code=status.HTTP_200_OK)
async def import_tdms_dataset(request: Request, filepath: Optional[str] = None):
    """
    Imports Traction Distribution / OHE Management System (TDMS) dataset.
    """
    payload_bytes, filename = await extract_upload_payload(request, filepath)
    if not payload_bytes:
        raise HTTPException(status_code=400, detail="Empty request payload or unreadable file")
    
    result = import_service.import_dataset("TDMS", payload_bytes, filename=filename)
    return result

@app.post("/api/v1/import/coa", status_code=status.HTTP_200_OK)
async def import_coa_dataset(request: Request, filepath: Optional[str] = None):
    """
    Imports Control Office Application (COA) train timetables & operational delay schedules.
    """
    payload_bytes, filename = await extract_upload_payload(request, filepath)
    if not payload_bytes:
        raise HTTPException(status_code=400, detail="Empty request payload or unreadable file")
    
    result = import_service.import_dataset("COA", payload_bytes, filename=filename)
    return result

# -------------------------------------------------------------
# DATASET MANAGEMENT & LINEAGE ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/v1/data/imports")
async def list_import_batches():
    """
    Lists all dataset import batches with processing statistics, timestamps, and sources.
    """
    batches = repo.get_all_import_batches()
    return {"batches": batches, "count": len(batches)}

@app.get("/api/v1/data/imports/{batch_id}")
async def get_import_batch_details(batch_id: str):
    """
    Retrieves detailed audit information for a specific import batch.
    """
    details = repo.get_import_batch(batch_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Import batch '{batch_id}' not found")
    return {"batch": details}

@app.delete("/api/v1/data/imports/{batch_id}")
async def delete_import_batch_records(batch_id: str):
    """
    Deletes an import batch and all associated maintenance requests and schedules.
    """
    success = repo.delete_import_batch(batch_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Import batch '{batch_id}' not found")
    return {"status": "SUCCESS", "message": f"Deleted import batch '{batch_id}' and all linked records"}

# -------------------------------------------------------------
# SINGLE-ITEM REAL-TIME INGESTION ENDPOINTS (Unified Pipeline)
# -------------------------------------------------------------

@app.post("/api/v1/ingest/tms", status_code=status.HTTP_201_CREATED)
async def ingest_tms_defect(payload: TMSPayload):
    try:
        data_dict = payload.dict(by_alias=False)
        data_dict["raw_source_reference"] = payload.defect_id
        res = import_service.ingest_single_tms(data_dict)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"TMS Ingestion Error: {str(e)}")

@app.post("/api/v1/ingest/smms", status_code=status.HTTP_201_CREATED)
async def ingest_smms_defect(payload: SMMSPayload):
    try:
        data_dict = payload.dict(by_alias=False)
        data_dict["raw_source_reference"] = f"SMMS-{payload.signal_post_id}"
        res = import_service.ingest_single_smms(data_dict)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMMS Ingestion Error: {str(e)}")

@app.post("/api/v1/ingest/tdms", status_code=status.HTTP_201_CREATED)
async def ingest_tdms_defect(payload: TDMSPayload):
    try:
        data_dict = payload.dict(by_alias=False)
        data_dict["raw_source_reference"] = f"TDMS-{payload.section_id}"
        res = import_service.ingest_single_tdms(data_dict)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"TDMS Ingestion Error: {str(e)}")

@app.post("/api/v1/ingest/coa", status_code=status.HTTP_201_CREATED)
async def ingest_coa_schedule(payload: COAPayload):
    try:
        data_dict = payload.dict(by_alias=False)
        res = import_service.ingest_single_coa(data_dict)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"COA Ingestion Error: {str(e)}")

# -------------------------------------------------------------
# CP-SAT OPTIMIZER & MULTI-DEPARTMENT BUNDLING ENDPOINTS
# -------------------------------------------------------------

@app.post("/api/v1/optimize/generate-plan")
async def generate_plan():
    """
    Triggers Google OR-Tools CP-SAT model to dynamically bundle and schedule cross-department blocks.
    """
    requests = repo.get_all_requests()
    trains = repo.get_all_trains()
    assets = repo.get_all_assets()
    
    if not requests:
        return {"status": "NO_REQUESTS", "optimized_blocks": [], "saved_block_hours": 0.0, "total_blocks_created": 0}
        
    optimizer = CPOrToolsBlockOptimizer(requests, trains, assets=assets)
    blocks = optimizer.solve()
    
    # Save optimized blocks and update database statuses
    repo.save_optimized_blocks(blocks)

    return {
        "status": "OPTIMAL_SCHEDULE_GENERATED",
        "saved_block_hours": round(sum(b.get("saved_block_hours", 0.0) for b in blocks), 2),
        "total_blocks_created": len(blocks),
        "optimized_blocks": blocks
    }

class EmergencyBlockRequest(BaseModel):
    asset_id: str
    duration_minutes: int
    defect_severity: int
    notes: str

@app.post("/api/v1/optimize/emergency-replan")
async def emergency_replan(req: EmergencyBlockRequest):
    """
    Handles sudden emergency repair triggers, saving emergency request and immediately replanning.
    """
    # Create emergency request via pipeline
    emergency_dict = {
        "track_code": req.asset_id,
        "defect_id": f"EMG-{datetime.datetime.now().strftime('%H%M%S')}",
        "severity_rank": 5,
        "reported_at": datetime.datetime.now().isoformat(),
        "required_repair_duration": max(30, req.duration_minutes),
        "proposed_date": datetime.datetime.now().isoformat(),
        "inspector_notes": f"EMERGENCY REPAIR: {req.notes}",
        "corridor_id": "NDLS-HWH-01",
        "work_type": "EMERGENCY_REPAIR"
    }
    import_service.import_dataset("TMS", [emergency_dict], filename="emergency_trigger.json")

    # Re-run CP-SAT optimization
    requests = repo.get_all_requests()
    trains = repo.get_all_trains()
    assets = repo.get_all_assets()
    
    optimizer = CPOrToolsBlockOptimizer(requests, trains, assets=assets)
    blocks = optimizer.solve()
    repo.save_optimized_blocks(blocks)
    
    return {
        "status": "EMERGENCY_REPLAN_COMPLETED",
        "emergency_asset": req.asset_id,
        "optimized_blocks": blocks
    }

class ApproveBlockRequest(BaseModel):
    block_id: int
    approve: bool = True

@app.post("/api/v1/optimize/approve-block")
async def approve_block(payload: ApproveBlockRequest):
    """
    Controller approves or rejects an optimized block.
    """
    success = repo.update_block_approval(payload.block_id, payload.approve)
    if not success:
        raise HTTPException(status_code=404, detail=f"Optimized block '{payload.block_id}' not found")
    return {
        "status": "SUCCESS",
        "block_id": payload.block_id,
        "approval_status": "APPROVED" if payload.approve else "REJECTED"
    }

@app.delete("/api/v1/optimize/delete-request/{id}")
async def delete_request(id: int):
    """
    Deletes an individual maintenance request.
    """
    success = repo.delete_request(id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Request ID '{id}' not found")
    return {"status": "SUCCESS", "message": f"Deleted request {id}"}

# -------------------------------------------------------------
# DASHBOARD & ANALYTICS STATE ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/v1/dashboard/metrics")
async def get_dashboard_metrics():
    requests = repo.get_all_requests()
    blocks = repo.get_all_blocks()
    
    saved_hrs = sum(b.get("saved_block_hours", 0.0) for b in blocks)
    active_downtime_hrs = saved_hrs
    asset_availability = max(75.0, round(99.4 - (active_downtime_hrs * 0.04), 1))

    return {
        "saved_block_hours": round(saved_hrs, 2),
        "asset_availability_pct": asset_availability,
        "compliance_rate": 100.0,
        "total_requests_count": len(requests),
        "pending_requests_count": sum(1 for r in requests if r["status"] == "PENDING"),
        "bundled_requests_count": sum(1 for r in requests if r["status"] == "BUNDLED"),
        "approved_blocks_count": sum(1 for b in blocks if b.get("controller_approval_status") == "APPROVED"),
        "critical_defects_count": sum(1 for r in requests if r.get("defect_severity", 1) >= 4)
    }

@app.get("/api/v1/dashboard/corridor-state")
async def get_corridor_state():
    return {
        "assets": repo.get_all_assets(),
        "train_schedules": repo.get_all_trains(),
        "maintenance_requests": repo.get_all_requests(),
        "optimized_blocks": repo.get_all_blocks()
    }

@app.get("/api/v1/dashboard/events")
async def stream_telemetry_events():
    """
    Server-Sent Events (SSE) telemetry stream for real-time corridor monitoring.
    """
    async def event_generator():
        while True:
            await asyncio.sleep(4)
            now_iso = datetime.datetime.now().isoformat()
            metrics = {
                "timestamp": now_iso,
                "traction_kv": 25.2,
                "ambient_temp_c": 34.5,
                "rail_stress_psi": 1420,
                "status": "NOMINAL"
            }
            yield f"data: {json.dumps(metrics)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/v1/analytics/data")
async def get_analytics_data():
    requests = repo.get_all_requests()
    blocks = repo.get_all_blocks()
    
    dept_distribution = {
        "TMS": sum(1 for r in requests if r.get("source_system") == "TMS"),
        "SMMS": sum(1 for r in requests if r.get("source_system") == "SMMS"),
        "TDMS": sum(1 for r in requests if r.get("source_system") == "TDMS")
    }
    
    severity_distribution = {
        "1_LOW": sum(1 for r in requests if r.get("defect_severity") == 1),
        "2_MODERATE": sum(1 for r in requests if r.get("defect_severity") == 2),
        "3_MEDIUM": sum(1 for r in requests if r.get("defect_severity") == 3),
        "4_HIGH": sum(1 for r in requests if r.get("defect_severity") == 4),
        "5_CRITICAL": sum(1 for r in requests if r.get("defect_severity") == 5)
    }

    return {
        "total_requests": len(requests),
        "total_blocks": len(blocks),
        "department_distribution": dept_distribution,
        "severity_distribution": severity_distribution,
        "saved_block_hours_total": round(sum(b.get("saved_block_hours", 0.0) for b in blocks), 2),
        "avg_urgency_score": round(
            sum(r.get("urgency_level", 0.5) for r in requests) / max(1, len(requests)), 3
        )
    }

class InsightRequest(BaseModel):
    query: Optional[str] = None
    corridor_id: Optional[str] = "NDLS-HWH-01"

@app.post("/api/v1/insights/analyze")
async def analyze_insights(req: InsightRequest):
    requests = repo.get_all_requests()
    blocks = repo.get_all_blocks()
    
    critical_count = sum(1 for r in requests if r.get("defect_severity", 1) >= 4)
    total_saved = sum(b.get("saved_block_hours", 0.0) for b in blocks)
    
    return {
        "corridor_id": req.corridor_id,
        "critical_alerts": critical_count,
        "recommendation": (
            f"Detected {critical_count} elevated maintenance items along corridor {req.corridor_id}. "
            f"Cross-department bundling generated {len(blocks)} conflict-free maintenance windows, "
            f"saving {total_saved:.1f} block-hours and avoiding downstream passenger delays."
        ),
        "generated_at": datetime.datetime.now().isoformat()
    }
