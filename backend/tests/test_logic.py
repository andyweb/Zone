"""Test unitari delle logiche pure (senza DB): TTL clamp, categorie, broker."""

from __future__ import annotations

from datetime import timedelta

import pytest

from app.broker import Subscriber, haversine_m
from app.categories import is_valid_category, ttl_minutes_for
from app.config import settings
from app.moderation import find_blocked, is_clean, normalize
from app.roles import is_verified, resolve_role, trust_for_role
from app.services.reports import _clamp_expiry, _now


def test_categorie_lista_chiusa():
    assert is_valid_category("allagamento")
    assert not is_valid_category("categoria_inventata")
    assert ttl_minutes_for("allagamento") > 0


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


def test_moderazione_testo_pulito():
    assert is_clean("Strada allagata vicino al ponte")
    assert is_clean(None)
    assert is_clean("")
    assert find_blocked("traffico intenso in centro") == []


def test_moderazione_rileva_turpiloquio():
    assert not is_clean("che cazzo di traffico")
    assert "cazzo" in find_blocked("che cazzo di traffico")


def test_moderazione_evasioni():
    # maiuscole + leetspeak + lettere ripetute + separatori
    assert not is_clean("MERDA")
    assert not is_clean("c4zz0")
    assert not is_clean("caaaazzo")
    assert not is_clean("c-a-z-z-o")
    assert not is_clean("$tronzo")


def test_normalize_collassa_ripetizioni():
    # le ripetizioni si collassano a 1; la blocklist è collassata allo stesso
    # modo, quindi `caaaazzo` resta intercettato (vedi test_moderazione_evasioni)
    assert normalize("caaaazzo") == "cazo"
    assert normalize("MERDA") == "merda"


def test_ruoli_verificati():
    assert is_verified("volontario")
    assert is_verified("operatore")
    assert not is_verified("cittadino")


def test_resolve_role_default_cittadino():
    # senza codice, o con codice ignoto, si resta cittadino (fail-safe)
    assert resolve_role(None) == "cittadino"
    assert resolve_role("") == "cittadino"
    assert resolve_role("codice-a-caso") == "cittadino"


def test_resolve_role_da_codice(monkeypatch):
    monkeypatch.setattr(settings, "enrollment_code_volontario", "VOL-2026")
    monkeypatch.setattr(settings, "enrollment_code_operatore", "OPS-2026")
    assert resolve_role("VOL-2026") == "volontario"
    assert resolve_role("OPS-2026") == "operatore"
    assert resolve_role(" VOL-2026 ") == "volontario"  # trim
    assert resolve_role("vol-2026") == "cittadino"  # match esatto (case-sensitive)


def test_trust_per_ruolo():
    assert trust_for_role("operatore") > trust_for_role("volontario")
    assert trust_for_role("volontario") > trust_for_role("cittadino")
