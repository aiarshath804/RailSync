from datetime import datetime
from fastapi import APIRouter
from backend.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
@router.get("/api/v1/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now().isoformat(),
        "solver": "OR-Tools CP-SAT"
    }
