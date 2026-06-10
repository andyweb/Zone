"""Notifiche push via Expo (sezione 5.3) — dietro flag (push_enabled).

Filtro geografico server-side: si inviano push solo agli utenti la cui ULTIMA
posizione nota cade entro `push_radius_m` dalla segnalazione e non è più vecchia
di `push_location_max_age_minutes`. L'autore della segnalazione è escluso.

PRIVACY (sezione 8): la posizione utente è memorizzata come singolo punto
sovrascritto (vedi models.User.last_location), facoltativo e azzerabile dal
client. Senza posizione nota recente l'utente non riceve push.
"""

from __future__ import annotations

import logging

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..schemas import ReportOut

logger = logging.getLogger(__name__)


async def notify_nearby_users(
    session: AsyncSession,
    report: ReportOut,
    exclude_user_id: int | None = None,
) -> None:
    if not settings.push_enabled:
        return

    rows = (
        await session.execute(
            text(
                """
                SELECT expo_push_token
                FROM users
                WHERE expo_push_token IS NOT NULL
                  AND last_location IS NOT NULL
                  AND last_location_at >
                        now() - make_interval(mins => :max_age)
                  AND (:exclude_id IS NULL OR id <> :exclude_id)
                  AND ST_DWithin(
                        last_location,
                        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                        :radius_m
                  )
                """
            ),
            {
                "max_age": settings.push_location_max_age_minutes,
                "exclude_id": exclude_user_id,
                "lat": report.lat,
                "lon": report.lon,
                "radius_m": settings.push_radius_m,
            },
        )
    ).scalars().all()

    tokens = [t for t in rows if t]
    if not tokens:
        return

    messages = [
        {
            "to": token,
            "title": "Nuova segnalazione vicino a te",
            "body": report.note or report.category,
            "data": {"report_id": report.id, "category": report.category},
        }
        for token in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(settings.expo_push_url, json=messages)
    except httpx.HTTPError as exc:  # non blocca il flusso principale
        logger.warning("invio push Expo fallito: %s", exc)
