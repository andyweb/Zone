"""Notifiche push via Expo (sezione 5.3) — dietro flag (push_enabled).

PRIVACY (sezione 8): per inviare push agli utenti "vicini" servirebbe
memorizzare l'ultima posizione nota dell'utente. Questa è una scelta con
implicazioni GDPR e va valutata prima di abilitare la feature in produzione.
Per ora la funzione è dietro flag e, finché non si decide il modello di
storage della posizione, invia (al più) agli utenti con un push token
registrato senza filtro geografico server-side. Lasciata pronta per il
filtro per raggio quando la posizione utente sarà disponibile.
"""

from __future__ import annotations

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import User
from ..schemas import ReportOut

logger = logging.getLogger(__name__)


async def notify_nearby_users(session: AsyncSession, report: ReportOut) -> None:
    if not settings.push_enabled:
        return

    tokens = (
        await session.scalars(
            select(User.expo_push_token).where(User.expo_push_token.is_not(None))
        )
    ).all()
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
