from backend.api.routers.ingest import router as ingest_router
from backend.api.routers.optimization import router as optimization_router
from backend.api.routers.dashboard import router as dashboard_router
from backend.api.routers.analytics import router as analytics_router
from backend.api.routers.insights import router as insights_router
from backend.api.routers.health import router as health_router

__all__ = [
    "ingest_router",
    "optimization_router",
    "dashboard_router",
    "analytics_router",
    "insights_router",
    "health_router",
]
