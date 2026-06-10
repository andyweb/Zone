"""Schemi Pydantic (v2) per request/response."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .categories import CATEGORIES, is_valid_category


# --- Auth ---
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    trust_score: float


# --- Reports ---
class ReportCreateIn(BaseModel):
    category: str
    note: str | None = Field(default=None, max_length=280)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)

    @field_validator("category")
    @classmethod
    def _category_in_closed_list(cls, v: str) -> str:
        if not is_valid_category(v):
            raise ValueError(
                f"categoria non valida; ammesse: {sorted(CATEGORIES)}"
            )
        return v


class ReportOut(BaseModel):
    id: int
    category: str
    note: str | None
    lat: float
    lon: float
    confirms: int
    denials: int
    status: str
    seconds_left: int


class VoteIn(BaseModel):
    vote: int

    @field_validator("vote")
    @classmethod
    def _only_plus_minus_one(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("vote deve essere +1 (conferma) o -1 (smentita)")
        return v


class PushTokenIn(BaseModel):
    expo_push_token: str = Field(min_length=1, max_length=255)


class LocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


# --- Categorie (esposte al client per colori/etichette/TTL) ---
class CategoryOut(BaseModel):
    key: str
    label: str
    color: str
    ttl_minutes: int


class SSEReportEvent(BaseModel):
    """Forma del payload SSE (created / updated / removed)."""

    type: str
    report: ReportOut | None = None
    report_id: int | None = None
