"""Router reports: creazione, nearby, voto. Più endpoint categorie."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..categories import CATEGORIES
from ..config import settings
from ..db import get_session
from ..models import User
from ..schemas import (
    CategoryOut,
    ReportCreateIn,
    ReportOut,
    VoteIn,
)
from ..services import reports as svc
from ..services.notify import notify_nearby_users

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
    await notify_nearby_users(session, out)
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
    return await svc.nearby_reports(session, lat, lon, radius_m)


@router.post("/reports/{report_id}/vote", response_model=ReportOut)
async def vote(
    report_id: int,
    payload: VoteIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportOut:
    return await svc.vote_report(session, user, report_id, payload.vote)
