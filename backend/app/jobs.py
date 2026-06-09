"""Job di scadenza (sezione 4.3) con APScheduler.

Ogni `expiry_job_interval_minutes` marca come 'expired' le segnalazioni
attive scadute e pubblica un evento SSE 'removed' per ciascuna, così la
mappa dei client si pulisce in tempo reale.

Le query di lettura filtrano comunque per status='active' AND expires_at>now(),
quindi il job non è il gate di correttezza: serve a tenere pulita la tabella
e ad alimentare l'evento di rimozione.
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text

from .broker import broker
from .config import settings
from .db import SessionLocal

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def expire_reports() -> None:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    UPDATE reports
                    SET status = 'expired'
                    WHERE status = 'active' AND expires_at < now()
                    RETURNING id,
                              ST_Y(geom::geometry) AS lat,
                              ST_X(geom::geometry) AS lon
                    """
                )
            )
        ).mappings().all()
        await session.commit()

    if rows:
        logger.info("job scadenza: %d segnalazioni marcate 'expired'", len(rows))
    for r in rows:
        await broker.publish(
            "removed", r["lat"], r["lon"], {"report_id": r["id"]}
        )


def start_scheduler() -> None:
    scheduler.add_job(
        expire_reports,
        "interval",
        minutes=settings.expiry_job_interval_minutes,
        id="expire_reports",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info(
        "scheduler avviato: scadenza ogni %d min",
        settings.expiry_job_interval_minutes,
    )


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
