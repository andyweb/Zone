"""Router auth: registrazione email/password e login → JWT."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import create_access_token, hash_password, verify_password
from ..db import get_session
from ..models import User
from ..roles import resolve_role, trust_for_role
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterIn, session: AsyncSession = Depends(get_session)
) -> User:
    # Accreditamento: il codice (se valido) eleva il ruolo e la reputazione.
    role = resolve_role(payload.enrollment_code)
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=role,
        trust_score=trust_for_role(role),
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="email già registrata"
        )
    await session.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
async def login(
    payload: LoginIn, session: AsyncSession = Depends(get_session)
) -> TokenOut:
    user = await session.scalar(
        select(User).where(User.email == payload.email.lower())
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="credenziali non valide",
        )
    return TokenOut(access_token=create_access_token(user.id))
