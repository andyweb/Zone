"""Modelli SQLAlchemy 2.x + GeoAlchemy2 (PostGIS)."""

from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # reputazione utente: pesa i voti (anti-abuso)
    trust_score: Mapped[float] = mapped_column(
        Numeric, nullable=False, server_default="1.0"
    )
    # ruolo: cittadino | volontario | operatore (accreditamento Protezione
    # Civile via codice in registrazione). Pesa la fiducia e marca le
    # segnalazioni come "verificate".
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="cittadino"
    )
    expo_push_token: Mapped[str | None] = mapped_column(String(255))
    # Ultima posizione nota: usata SOLO per filtrare le push per raggio
    # (sezione 5.3). Scelta GDPR: facoltativa, sovrascritta (non storicizzata)
    # e azzerata al logout / con la cancellazione del push token.
    last_location: Mapped[object | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    last_location_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    reports: Mapped[list["Report"]] = relationship(back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    # ruolo dell'autore al momento della creazione (denormalizzato): permette di
    # mostrare il badge "verificata" senza join, e resta stabile nel tempo.
    author_role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="cittadino"
    )
    note: Mapped[str | None] = mapped_column(String(280))
    # URL relativo della foto allegata (es. /media/reports/<uuid>.jpg), opzionale.
    photo_path: Mapped[str | None] = mapped_column(String(255))
    geom: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # cuore del comportamento "live"
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    confirms: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    denials: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    # active | expired | removed
    status: Mapped[str] = mapped_column(
        String(12), nullable=False, server_default="active"
    )

    user: Mapped["User"] = relationship(back_populates="reports")

    __table_args__ = (
        Index("idx_reports_active", "status", "expires_at"),
        Index("idx_reports_geom", "geom", postgresql_using="gist"),
    )


class ReportVote(Base):
    __tablename__ = "report_votes"

    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("reports.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), primary_key=True
    )
    vote: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # +1 / -1
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ReportFlag(Base):
    """Segnalazione di abuso su una segnalazione ("report di un report").

    Una sola flag per utente per segnalazione (chiave primaria composta).
    Oltre la soglia (`moderation_flag_threshold`) la segnalazione viene
    auto-rimossa in attesa di revisione (sezione 8).
    """

    __tablename__ = "report_flags"

    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("reports.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), primary_key=True
    )
    reason: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
