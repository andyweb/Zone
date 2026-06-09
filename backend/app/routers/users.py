"""Router users: registrazione Expo push token."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..schemas import PushTokenIn, UserOut

router = APIRouter(prefix="/users", tags=["users"])


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
