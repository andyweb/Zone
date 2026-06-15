"""Router users: push token (registrazione/cancellazione) e posizione.

La posizione viene memorizzata SOLO per filtrare le notifiche push per raggio
(sezione 5.3). Niente storico: è un singolo punto sovrascritto, azzerabile dal
client (privacy by design, sezione 8).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..schemas import LocationIn, PushTokenIn, UserOut
from ..services.account import delete_account

router = APIRouter(prefix="/users", tags=["users"])


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Cancella definitivamente l'account e tutti i dati collegati
    (diritto all'oblio, GDPR — sezione 8)."""
    await delete_account(session, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/push-token", response_model=UserOut)
async def set_push_token(
    payload: PushTokenIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    user.expo_push_token = payload.expo_push_token
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def clear_push_token(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Disattiva le push e cancella l'ultima posizione nota (usato al logout)."""
    user.expo_push_token = None
    user.last_location = None
    user.last_location_at = None
    session.add(user)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/location", status_code=status.HTTP_204_NO_CONTENT)
async def set_location(
    payload: LocationIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Aggiorna l'ultima posizione nota (geography point, sovrascritta)."""
    await session.execute(
        text(
            """
            UPDATE users
            SET last_location = ST_SetSRID(
                    ST_MakePoint(:lon, :lat), 4326
                )::geography,
                last_location_at = now()
            WHERE id = :id
            """
        ),
        {"id": user.id, "lat": payload.lat, "lon": payload.lon},
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
