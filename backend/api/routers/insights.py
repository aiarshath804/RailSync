from fastapi import APIRouter
from backend.services.insights_service import InsightsService
from backend.schemas.operations import AIInsightResponse

router = APIRouter(tags=["AI Insights & Safety Audit"])

@router.post("/insights/analyze", response_model=AIInsightResponse)
async def analyze_corridor_insights():
    return await InsightsService.generate_insights()

@router.post("/gemini/insights", response_model=AIInsightResponse)
async def gemini_insights_alias():
    return await InsightsService.generate_insights()
