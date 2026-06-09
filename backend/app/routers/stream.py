"""Router SSE (sezione 5.2): GET /reports/stream?lat=&lon=&radius_m=.

Mantiene una connessione aperta e inoltra gli eventi del broker in-memory
filtrati per area: created / updated / removed. Keepalive periodico per non
far cadere la connessione dietro i proxy.

Auth: il token può arrivare via header Authorization (client REST) oppure
come query param `token` (EventSource del browser non supporta header custom).
"""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import _decode_token
from ..broker import broker
from ..config import settings
from ..db import get_session
from ..models import User

router = APIRouter(tags=["reports"])


async def _user_from_query_or_header(
    request: Request,
    token: str | None,
    session: AsyncSession,
) -> User:
    raw = token
    if raw is None:
        header = request.headers.get("authorization", "")
        if header.lower().startswith("bearer "):
            raw = header[7:]
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="token mancante"
        )
    user = await session.get(User, _decode_token(raw))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="utente inesistente"
        )
    return user


@router.get("/reports/stream")
async def stream(
    request: Request,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    radius_m: int = Query(
        default=settings.nearby_default_radius_m,
        ge=1,
        le=settings.nearby_max_radius_m,
    ),
    token: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    await _user_from_query_or_header(request, token, session)
    sub = await broker.subscribe(lat, lon, radius_m)

    async def event_gen():
        try:
            # evento iniziale: il client sa che lo stream è attivo
            yield "event: ready\ndata: {}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(
                        sub.queue.get(), timeout=settings.sse_keepalive_seconds
                    )
                except asyncio.TimeoutError:
                    # keepalive (commento SSE)
                    yield ": keepalive\n\n"
                    continue
                event_type = msg.get("type", "message")
                data = json.dumps(msg, default=str)
                yield f"event: {event_type}\ndata: {data}\n\n"
        finally:
            await broker.unsubscribe(sub)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disattiva buffering su nginx
        },
    )
