"""Lista CHIUSA delle categorie di segnalazione.

ATTENZIONE — PLACEHOLDER (vedi brief, sezione 7).
Le categorie qui sotto sono valori di ESEMPIO/fittizi: chiave tecnica,
etichetta visibile, colore mappa e TTL base. La scelta definitiva è una
decisione di prodotto dell'autore con implicazioni legali dirette
(vedi sezione 8 del brief) e va presa PRIMA del rilascio pubblico.

Il sistema è progettato per reggere qualunque set, purché resti una lista
chiusa (enum). Per cambiare le categorie basta modificare questo dizionario:
nessun altro punto del codice contiene categorie hard-coded.
"""

from __future__ import annotations

from typing import TypedDict


class CategorySpec(TypedDict):
    label: str          # etichetta visibile in app
    color: str          # colore marker sulla mappa (hex)
    ttl_minutes: int    # TTL base alla creazione


# NB: valori fittizi, DA RIMPIAZZARE prima del rilascio.
CATEGORIES: dict[str, CategorySpec] = {
    "esempio_a": {"label": "Esempio A", "color": "#E24B4A", "ttl_minutes": 180},
    "esempio_b": {"label": "Esempio B", "color": "#EF9F27", "ttl_minutes": 360},
    "esempio_c": {"label": "Esempio C", "color": "#3B82C4", "ttl_minutes": 90},
}

CATEGORY_KEYS: frozenset[str] = frozenset(CATEGORIES.keys())


def is_valid_category(key: str) -> bool:
    return key in CATEGORY_KEYS


def ttl_minutes_for(key: str) -> int:
    """TTL base (minuti) della categoria. Solleva KeyError se sconosciuta."""
    return CATEGORIES[key]["ttl_minutes"]
