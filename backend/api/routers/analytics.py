from fastapi import APIRouter
from backend.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/data")
async def get_analytics_data():
    return AnalyticsService.get_analytics_dataset()
