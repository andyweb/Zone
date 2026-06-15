"""Router reports: creazione, nearby, dettaglio, modifica nota, eliminazione,
voto. Più endpoint categorie."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..categories import CATEGORIES
from ..config import settings
from ..db import get_session
from ..models import User
from ..schemas import (
    CategoryOut,
    FlagIn,
    FlagOut,
    ReportCreateIn,
    ReportNoteUpdateIn,
    ReportOut,
    VoteIn,
)
from ..services import reports as svc
from ..services.notify import notify_nearby_users
from ..services.photos import save_report_photo

router = APIRouter(tags=["reports"])


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories() -> list[CategoryOut]:
    return [
        CategoryOut(key=key, **spec) for key, spec in CATEGORIES.items()
    ]


@router.post("/reports", response_model=ReportOut, status_code=201)
async def create_report(
    payload: ReportCreateIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportOut:
    out = await svc.create_report(
        session, user, payload.category, payload.note, payload.lat, payload.lon
    )
    await notify_nearby_users(session, out, exclude_user_id=user.id)
    return out


@router.get("/reports/nearby", response_model=list[ReportOut])
async def nearby(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    radius_m: int = Query(
        default=settings.nearby_default_radius_m,
        ge=1,
        le=settings.nearby_max_radius_m,
    ),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReportOut]:
    return await svc.nearby_reports(session, lat, lon, radius_m, user.id)


@router.get("/reports/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportOut:
    return await svc.get_report(session, report_id, user)


@router.patch("/reports/{report_id}", response_model=ReportOut)
async def update_report_note(
    report_id: int,
    payload: ReportNoteUpdateIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportOut:
    return await svc.update_report_note(session, user, report_id, payload.note)


@router.delete(
    "/reports/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_report(
    report_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    await svc.delete_report(session, user, report_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/reports/{report_id}/vote", response_model=ReportOut)
async def vote(
    report_id: int,
    payload: VoteIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportOut:
    return await svc.vote_report(session, user, report_id, payload.vote)


@router.post("/reports/{report_id}/photo", response_model=ReportOut)
async def upload_photo(
    report_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportOut:
    """Allega/sostituisce la foto della propria segnalazione (solo autore).

    L'immagine viene re-encodata in JPEG (strip EXIF + downscale) prima del
    salvataggio. Controllo dei permessi PRIMA di scrivere il file su disco.
    """
    report = await svc.require_owned_active(session, user, report_id)
    photo_path = await save_report_photo(file)
    return await svc.set_report_photo(session, report, photo_path)


@router.post("/reports/{report_id}/flag", response_model=FlagOut)
async def flag(
    report_id: int,
    payload: FlagIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FlagOut:
    """Segnala un abuso su una segnalazione (moderazione, sezione 8)."""
    return await svc.flag_report(session, user, report_id, payload.reason)
