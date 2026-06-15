"""Schemi Pydantic (v2) per request/response."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .categories import CATEGORIES, is_valid_category


# --- Auth ---
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # Codice di accreditamento (opzionale): se valido, assegna il ruolo
    # volontario/operatore. Altrimenti si resta cittadino. Vedi app/roles.py.
    enrollment_code: str | None = Field(default=None, max_length=64)


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
    role: str


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


class ReportNoteUpdateIn(BaseModel):
    note: str | None = Field(default=None, max_length=280)


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
    # Ruolo dell'autore e flag "verificata" (fonte accreditata PC).
    author_role: str = "cittadino"
    verified: bool = False
    # True solo nella risposta di dettaglio quando il richiedente è l'autore:
    # abilita modifica/eliminazione lato client.
    is_mine: bool = False


class VoteIn(BaseModel):
    vote: int

    @field_validator("vote")
    @classmethod
    def _only_plus_minus_one(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("vote deve essere +1 (conferma) o -1 (smentita)")
        return v


# --- Segnalazione abusi (flag) ---
# Lista CHIUSA dei motivi: validata come per le categorie.
FLAG_REASONS: frozenset[str] = frozenset(
    {"spam", "offensivo", "falso", "altro"}
)


class FlagIn(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def _reason_in_closed_list(cls, v: str) -> str:
        if v not in FLAG_REASONS:
            raise ValueError(
                f"motivo non valido; ammessi: {sorted(FLAG_REASONS)}"
            )
        return v


class FlagOut(BaseModel):
    report_id: int
    flags: int          # numero totale di segnalazioni-abuso sulla segnalazione
    removed: bool        # True se la soglia ha causato l'auto-rimozione


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
