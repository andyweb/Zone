"""Broker in-memory publish/subscribe per gli eventi SSE.

Scelta (brief, sezione 5.2): broker in-memory con filtro per area
geografica. Ogni subscriber dichiara il proprio centro (lat/lon) e raggio;
riceve solo gli eventi le cui segnalazioni cadono nel raggio.

LIMITE NOTO: lo stato vive nel processo. Con più worker/replica gli eventi
non si propagano tra i processi. Per il realtime "vero" multi-istanza
sostituire questo modulo con un backend pub/sub condiviso (es. Redis,
Postgres LISTEN/NOTIFY) mantenendo la stessa interfaccia publish/subscribe.
Fallback documentato per il primo step: il client può fare polling di
GET /reports/nearby ogni ~20s (vedi README).
"""

from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass, field

_EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distanza in metri tra due punti (approssimazione sferica)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(a))


@dataclass(eq=False)  # identità per oggetto: hashable, una entry per stream
class Subscriber:
    lat: float
    lon: float
    radius_m: float
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=100))

    def covers(self, lat: float, lon: float) -> bool:
        return haversine_m(self.lat, self.lon, lat, lon) <= self.radius_m


class ReportBroker:
    def __init__(self) -> None:
        self._subscribers: set[Subscriber] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self, lat: float, lon: float, radius_m: float) -> Subscriber:
        sub = Subscriber(lat=lat, lon=lon, radius_m=radius_m)
        async with self._lock:
            self._subscribers.add(sub)
        return sub

    async def unsubscribe(self, sub: Subscriber) -> None:
        async with self._lock:
            self._subscribers.discard(sub)

    async def publish(
        self, event_type: str, lat: float, lon: float, payload: dict
    ) -> None:
        """Inoltra l'evento ai soli subscriber che coprono il punto."""
        async with self._lock:
            targets = [s for s in self._subscribers if s.covers(lat, lon)]
        message = {"type": event_type, **payload}
        for sub in targets:
            try:
                sub.queue.put_nowait(message)
            except asyncio.QueueFull:
                # subscriber lento: si scarta l'evento più vecchio
                try:
                    sub.queue.get_nowait()
                    sub.queue.put_nowait(message)
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    pass


broker = ReportBroker()
