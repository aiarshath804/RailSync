from fastapi import APIRouter, status
from backend.schemas.requests import (
    TMSIngestSchema,
    SMMSIngestSchema,
    TDMSIngestSchema,
    COAIngestSchema,
    IngestResponse
)
from backend.services.ingestion_service import IngestionService

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

@router.post("/tms", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_tms_defect(payload: TMSIngestSchema):
    return await IngestionService.ingest_tms(payload)

@router.post("/smms", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_smms_fault(payload: SMMSIngestSchema):
    return await IngestionService.ingest_smms(payload)

@router.post("/tdms", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_tdms_anomaly(payload: TDMSIngestSchema):
    return await IngestionService.ingest_tdms(payload)

@router.post("/coa", status_code=status.HTTP_201_CREATED)
async def ingest_coa_schedule(payload: COAIngestSchema):
    return await IngestionService.ingest_coa(payload)
