"""Lista CHIUSA delle categorie di segnalazione.

Set di default "reale" per un'app di segnalazioni live locali (mobilità,
sicurezza, civico): chiave tecnica, etichetta visibile, colore marker sulla
mappa e TTL base alla creazione.

NB: la scelta definitiva resta una decisione di prodotto con implicazioni
legali (vedi brief, sezione 8) — va validata prima del rilascio pubblico,
evitando categorie sensibili per la giurisdizione di destinazione. Il sistema
regge qualunque set purché resti una lista chiusa (enum): per cambiarle basta
modificare questo dizionario, nessun'altra parte del codice contiene categorie
hard-coded.
"""

from __future__ import annotations

from typing import TypedDict


class CategorySpec(TypedDict):
    label: str          # etichetta visibile in app
    color: str          # colore marker sulla mappa (hex)
    ttl_minutes: int    # TTL base alla creazione


CATEGORIES: dict[str, CategorySpec] = {
    "incidente": {"label": "Incidente", "color": "#E2483F", "ttl_minutes": 120},
    "traffico": {"label": "Traffico", "color": "#EF7A27", "ttl_minutes": 90},
    "lavori": {"label": "Lavori in corso", "color": "#F4B400", "ttl_minutes": 480},
    "pericolo": {"label": "Pericolo", "color": "#B5341F", "ttl_minutes": 180},
    "viabilita": {"label": "Strada chiusa", "color": "#8A5BD6", "ttl_minutes": 240},
    "evento": {"label": "Evento / assembramento", "color": "#2F8FD6", "ttl_minutes": 240},
    "meteo": {"label": "Allerta meteo", "color": "#1B9E8A", "ttl_minutes": 360},
}

CATEGORY_KEYS: frozenset[str] = frozenset(CATEGORIES.keys())


def is_valid_category(key: str) -> bool:
    return key in CATEGORY_KEYS


def ttl_minutes_for(key: str) -> int:
    """TTL base (minuti) della categoria. Solleva KeyError se sconosciuta."""
    return CATEGORIES[key]["ttl_minutes"]
