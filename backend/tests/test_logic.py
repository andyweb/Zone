"""Test unitari delle logiche pure (senza DB): TTL clamp, categorie, broker."""

from __future__ import annotations

from datetime import timedelta

import pytest

from app.broker import Subscriber, haversine_m
from app.categories import is_valid_category, ttl_minutes_for
from app.config import settings
from app.services.reports import _clamp_expiry, _now


def test_categorie_lista_chiusa():
    assert is_valid_category("incidente")
    assert not is_valid_category("categoria_inventata")
    assert ttl_minutes_for("incidente") > 0


def test_clamp_expiry_floor():
    # scadenza nel passato → riportata almeno al floor
    clamped = _clamp_expiry(_now() - timedelta(hours=5))
    residuo = (clamped - _now()).total_seconds() / 60
    assert residuo >= settings.ttl_floor_minutes - 1


def test_clamp_expiry_ceiling():
    clamped = _clamp_expiry(_now() + timedelta(days=10))
    residuo = (clamped - _now()).total_seconds() / 60
    assert residuo <= settings.ttl_ceiling_minutes + 1


def test_haversine_zero():
    assert haversine_m(45.0, 9.0, 45.0, 9.0) == pytest.approx(0.0, abs=1e-6)


def test_subscriber_covers():
    sub = Subscriber(lat=45.0, lon=9.0, radius_m=1000)
    assert sub.covers(45.0, 9.0)
    assert not sub.covers(46.0, 9.0)  # ~111 km a nord
