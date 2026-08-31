import json
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from backend.services.dashboard_service import DashboardService
from backend.core.event_bus import event_bus
from backend.schemas.dashboard import DashboardMetricsResponse, CorridorStateResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Telemetry"])

@router.get("/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics():
    return DashboardService.get_metrics()

@router.get("/corridor-state")
async def get_corridor_state():
    return DashboardService.get_corridor_state()

async def sse_event_generator():
    # Send initial corridor state immediately upon connection
    initial_state = DashboardService.get_corridor_state()
    yield f"event: corridor_state_changed\ndata: {json.dumps(initial_state)}\n\n"

    # Stream real-time broadcast events
    async for event in event_bus.subscribe():
        event_type = event.get("event_type", "message")
        event_data = json.dumps(event)
        yield f"event: {event_type}\ndata: {event_data}\n\n"

@router.get("/events")
async def sse_events(request: Request):
    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/sse")
async def sse_stream_alias(request: Request):
    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
