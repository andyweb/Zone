"""Logiche di business: creazione, query nearby, voto, TTL, anti-abuso.

Tutti i parametri vengono da config.settings (nessun valore magico).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..broker import broker
from ..categories import ttl_minutes_for
from ..config import settings
from ..models import Report, ReportFlag, ReportVote, User
from ..moderation import find_blocked
from ..roles import is_verified
from ..schemas import FlagOut, ReportOut


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _point(lat: float, lon: float) -> WKTElement:
    # geography(Point, 4326): l'ordine è lon lat
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def _clamp_expiry(expires_at: datetime) -> datetime:
    """Mantiene la vita residua tra ttl_floor e ttl_ceiling (sezione 4.1)."""
    now = _now()
    floor = now + timedelta(minutes=settings.ttl_floor_minutes)
    ceiling = now + timedelta(minutes=settings.ttl_ceiling_minutes)
    if expires_at < floor:
        return floor
    if expires_at > ceiling:
        return ceiling
    return expires_at


def _seconds_left(expires_at: datetime) -> int:
    return max(0, int((expires_at - _now()).total_seconds()))


def _moderate_note(note: str | None) -> None:
    """Rifiuta la nota se contiene linguaggio non ammesso (sezione 8).

    Non riveliamo i termini trovati nella risposta (evita reverse-engineering
    della blocklist). Il filtro è disattivabile via `moderation_enabled`.
    """
    if note and settings.moderation_enabled and find_blocked(note):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="la nota contiene linguaggio non ammesso",
        )


def report_to_out(
    report: Report, lat: float, lon: float, is_mine: bool = False
) -> ReportOut:
    return ReportOut(
        id=report.id,
        category=report.category,
        note=report.note,
        lat=lat,
        lon=lon,
        confirms=report.confirms,
        denials=report.denials,
        status=report.status,
        seconds_left=_seconds_left(report.expires_at),
        author_role=report.author_role,
        verified=is_verified(report.author_role),
        is_mine=is_mine,
    )


async def _check_rate_limit(session: AsyncSession, user: User) -> None:
    """Max N segnalazioni/ora per utente (sezione 4.2)."""
    window_start = _now() - timedelta(hours=1)
    count = await session.scalar(
        select(func.count())
        .select_from(Report)
        .where(Report.user_id == user.id)
        .where(Report.created_at >= window_start)
    )
    if (count or 0) >= settings.reports_per_hour_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="limite di segnalazioni orarie raggiunto",
        )


async def _check_proximity_spam(
    session: AsyncSession, user: User, category: str, lat: float, lon: float
) -> None:
    """Anti-spam di prossimità: stessa categoria entro R metri e finestra T."""
    window_start = _now() - timedelta(
        minutes=settings.proximity_block_window_minutes
    )
    sql = text(
        """
        SELECT 1
        FROM reports
        WHERE user_id = :user_id
          AND category = :category
          AND created_at >= :window_start
          AND ST_DWithin(
                geom,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                :radius_m
          )
        LIMIT 1
        """
    )
    exists = await session.scalar(
        sql,
        {
            "user_id": user.id,
            "category": category,
            "window_start": window_start,
            "lat": lat,
            "lon": lon,
            "radius_m": settings.proximity_block_radius_m,
        },
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="segnalazione simile troppo vicina e troppo recente",
        )


async def create_report(
    session: AsyncSession,
    user: User,
    category: str,
    note: str | None,
    lat: float,
    lon: float,
) -> ReportOut:
    _moderate_note(note)
    await _check_rate_limit(session, user)
    await _check_proximity_spam(session, user, category, lat, lon)

    expires_at = _now() + timedelta(minutes=ttl_minutes_for(category))
    report = Report(
        user_id=user.id,
        category=category,
        author_role=user.role,
        note=note,
        geom=_point(lat, lon),
        expires_at=expires_at,
        status="active",
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    out = report_to_out(report, lat, lon)
    await broker.publish("created", lat, lon, {"report": out.model_dump()})
    return out


async def nearby_reports(
    session: AsyncSession,
    lat: float,
    lon: float,
    radius_m: int,
    user_id: int | None = None,
) -> list[ReportOut]:
    """Query "nearby" (sezione 5.1) — cuore dell'app.

    `is_mine` segnala le segnalazioni dell'utente corrente (per mostrargli i
    comandi, es. eliminazione, nell'elenco).
    """
    radius_m = min(max(radius_m, 1), settings.nearby_max_radius_m)
    sql = text(
        """
        SELECT id, category, author_role, note, confirms, denials, status,
               (user_id = :uid) AS is_mine,
               ST_Y(geom::geometry) AS lat,
               ST_X(geom::geometry) AS lon,
               EXTRACT(EPOCH FROM (expires_at - now())) AS seconds_left
        FROM reports
        WHERE status = 'active'
          AND expires_at > now()
          AND ST_DWithin(
                geom,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                :radius_m
          )
        ORDER BY created_at DESC
        """
    )
    rows = (
        await session.execute(
            sql, {"lat": lat, "lon": lon, "radius_m": radius_m, "uid": user_id}
        )
    ).mappings()
    return [
        ReportOut(
            id=r["id"],
            category=r["category"],
            note=r["note"],
            lat=r["lat"],
            lon=r["lon"],
            confirms=r["confirms"],
            denials=r["denials"],
            status=r["status"],
            seconds_left=max(0, int(r["seconds_left"])),
            author_role=r["author_role"],
            verified=is_verified(r["author_role"]),
            is_mine=bool(r["is_mine"]),
        )
        for r in rows
    ]


async def _report_coords(session: AsyncSession, report_id: int) -> tuple[float, float]:
    row = (
        await session.execute(
            text(
                "SELECT ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lon "
                "FROM reports WHERE id = :id"
            ),
            {"id": report_id},
        )
    ).mappings().first()
    return (row["lat"], row["lon"]) if row else (0.0, 0.0)


async def get_report(
    session: AsyncSession, report_id: int, user: User | None = None
) -> ReportOut:
    """Singola segnalazione per id (qualunque status, per dettaglio/deep link)."""
    report = await session.get(Report, report_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="segnalazione inesistente",
        )
    lat, lon = await _report_coords(session, report_id)
    is_mine = user is not None and report.user_id == user.id
    return report_to_out(report, lat, lon, is_mine=is_mine)


async def update_report_note(
    session: AsyncSession, user: User, report_id: int, note: str | None
) -> ReportOut:
    """L'autore corregge la nota. Categoria, posizione, voti e TTL invariati."""
    report = await session.get(Report, report_id)
    if report is None or report.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="segnalazione inesistente o non più attiva",
        )
    if report.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="puoi modificare solo le tue segnalazioni",
        )

    _moderate_note(note)
    report.note = (note or "").strip() or None
    await session.commit()
    await session.refresh(report)

    lat, lon = await _report_coords(session, report_id)
    # Il broadcast SSE va a tutti: niente is_mine (default False).
    broadcast = report_to_out(report, lat, lon)
    await broker.publish("updated", lat, lon, {"report": broadcast.model_dump()})
    # La risposta all'autore mantiene is_mine per i comandi in app.
    return report_to_out(report, lat, lon, is_mine=True)


async def delete_report(
    session: AsyncSession, user: User, report_id: int
) -> None:
    """L'autore elimina la propria segnalazione: rimozione definitiva + SSE."""
    report = await session.get(Report, report_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="segnalazione inesistente",
        )
    if report.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="puoi eliminare solo le tue segnalazioni",
        )

    # Coordinate prima della cancellazione (servono per il filtro SSE per area).
    lat, lon = await _report_coords(session, report_id)
    await session.delete(report)  # i voti spariscono per ON DELETE CASCADE
    await session.commit()

    await broker.publish("removed", lat, lon, {"report_id": report_id})


async def vote_report(
    session: AsyncSession, user: User, report_id: int, vote: int
) -> ReportOut:
    report = await session.get(Report, report_id)
    if report is None or report.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="segnalazione inesistente o non più attiva",
        )
    # Un utente non vota la propria segnalazione (sezione 3.2)
    if report.user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="non puoi votare la tua segnalazione",
        )
    # Un voto solo per segnalazione (chiave primaria composta)
    existing = await session.get(ReportVote, (report_id, user.id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="hai già votato questa segnalazione",
        )

    session.add(ReportVote(report_id=report_id, user_id=user.id, vote=vote))

    # Peso del voto = trust_score del votante (sezione 4.2). Lo usiamo per
    # modulare l'effetto sul TTL; confirms/denials restano conteggi grezzi
    # (coerenti con lo schema INT).
    weight = float(user.trust_score or 1.0)
    if vote == 1:
        report.confirms += 1
        delta = timedelta(minutes=settings.ttl_confirm_extend_minutes * weight)
        report.expires_at = _clamp_expiry(report.expires_at + delta)
    else:
        report.denials += 1
        delta = timedelta(minutes=settings.ttl_denial_shorten_minutes * weight)
        report.expires_at = _clamp_expiry(report.expires_at - delta)

    # Rimozione anti-abuso (sezione 4.2)
    removed = False
    if (
        report.denials >= settings.removal_denial_threshold
        and report.denials > report.confirms
    ):
        report.status = "removed"
        removed = True

    await session.commit()
    await session.refresh(report)

    lat, lon = await _report_coords(session, report_id)
    out = report_to_out(report, lat, lon)
    event = "removed" if removed else "updated"
    payload = {"report_id": report.id} if removed else {"report": out.model_dump()}
    await broker.publish(event, lat, lon, payload)
    return out


async def flag_report(
    session: AsyncSession, user: User, report_id: int, reason: str
) -> FlagOut:
    """Segnalazione di abuso su una segnalazione (sezione 8).

    Una flag per utente; non si segnala la propria. Oltre la soglia
    `moderation_flag_threshold` la segnalazione viene auto-rimossa
    (status='removed') in attesa di revisione e si emette l'evento SSE.
    """
    report = await session.get(Report, report_id)
    if report is None or report.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="segnalazione inesistente o non più attiva",
        )
    if report.user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="non puoi segnalare la tua segnalazione",
        )
    existing = await session.get(ReportFlag, (report_id, user.id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="hai già segnalato questa segnalazione",
        )

    session.add(ReportFlag(report_id=report_id, user_id=user.id, reason=reason))
    await session.flush()

    flags = await session.scalar(
        select(func.count())
        .select_from(ReportFlag)
        .where(ReportFlag.report_id == report_id)
    )
    flags = int(flags or 0)

    removed = flags >= settings.moderation_flag_threshold
    if removed:
        report.status = "removed"

    await session.commit()

    if removed:
        lat, lon = await _report_coords(session, report_id)
        await broker.publish("removed", lat, lon, {"report_id": report_id})

    return FlagOut(report_id=report_id, flags=flags, removed=removed)
