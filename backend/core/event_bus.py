import asyncio
import json
import datetime
from typing import Dict, Any, AsyncGenerator, Set

class EventBus:
    """
    Asynchronous in-memory Pub/Sub event bus for live SSE corridor events.
    Supports real-time operational events across all connected clients.
    """
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> AsyncGenerator[Dict[str, Any], None]:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        except asyncio.CancelledError:
            pass
        finally:
            self._subscribers.discard(queue)

    async def broadcast(self, event_type: str, data: Any):
        payload = {
            "event_type": event_type,
            "timestamp": datetime.datetime.now().isoformat(),
            "data": data
        }
        for queue in list(self._subscribers):
            try:
                await queue.put(payload)
            except Exception:
                self._subscribers.discard(queue)

# Singleton global instance
event_bus = EventBus()
