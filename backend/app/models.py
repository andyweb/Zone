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
    expo_push_token: Mapped[str | None] = mapped_column(String(255))

    reports: Mapped[list["Report"]] = relationship(back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    note: Mapped[str | None] = mapped_column(String(280))
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
