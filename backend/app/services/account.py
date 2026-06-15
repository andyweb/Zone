"""Cancellazione account — diritto all'oblio GDPR (sezione 8).

Su richiesta dell'utente cancelliamo DEFINITIVAMENTE: l'utente, le sue
segnalazioni (con voti e flag collegati, per ON DELETE CASCADE), i suoi voti e
le sue flag su segnalazioni altrui, e la posizione nota. Per le segnalazioni
attive dell'utente emettiamo l'evento SSE 'removed' così la mappa dei client si
pulisce in tempo reale.

Le FK `*.user_id` non hanno CASCADE (l'utente non va cancellato per errore con
un report): qui l'ordine delle DELETE garantisce che nessun riferimento resti
prima di rimuovere la riga `users`.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..broker import broker
from ..models import User


async def delete_account(session: AsyncSession, user: User) -> None:
    user_id = user.id

    # Coordinate delle segnalazioni attive: servono per il filtro SSE per area,
    # da leggere PRIMA della cancellazione.
    active = (
        await session.execute(
            text(
                """
                SELECT id,
                       ST_Y(geom::geometry) AS lat,
                       ST_X(geom::geometry) AS lon
                FROM reports
                WHERE user_id = :uid AND status = 'active'
                """
            ),
            {"uid": user_id},
        )
    ).mappings().all()

    # 1) voti e flag dell'utente su segnalazioni ALTRUI (FK senza cascade).
    await session.execute(
        text("DELETE FROM report_votes WHERE user_id = :uid"), {"uid": user_id}
    )
    await session.execute(
        text("DELETE FROM report_flags WHERE user_id = :uid"), {"uid": user_id}
    )
    # 2) segnalazioni dell'utente: i loro voti/flag spariscono per CASCADE.
    await session.execute(
        text("DELETE FROM reports WHERE user_id = :uid"), {"uid": user_id}
    )
    # 3) infine l'utente: nessun riferimento residuo.
    await session.execute(
        text("DELETE FROM users WHERE id = :uid"), {"uid": user_id}
    )
    await session.commit()

    for r in active:
        await broker.publish("removed", r["lat"], r["lon"], {"report_id": r["id"]})
