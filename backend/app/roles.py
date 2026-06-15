"""Ruoli utente (lista CHIUSA) — verticalizzazione Protezione Civile.

Tre ruoli: cittadino (default), volontario, operatore. I ruoli "accreditati"
(volontario/operatore) producono segnalazioni **verificate** (badge in app) e i
loro voti pesano di più (trust_score più alto).

L'assegnazione NON è auto-dichiarata: avviene in registrazione tramite un
**codice di accreditamento** che l'ente (comune / organizzazione di volontariato)
distribuisce. I codici e i pesi vivono in config.py (nessun valore magico).
"""

from __future__ import annotations

from .config import settings

CITTADINO = "cittadino"
VOLONTARIO = "volontario"
OPERATORE = "operatore"

ROLES: frozenset[str] = frozenset({CITTADINO, VOLONTARIO, OPERATORE})

# Ruoli le cui segnalazioni sono considerate "verificate" (fonte accreditata).
VERIFIED_ROLES: frozenset[str] = frozenset({VOLONTARIO, OPERATORE})

# Etichette visibili in app.
ROLE_LABELS: dict[str, str] = {
    CITTADINO: "Cittadino",
    VOLONTARIO: "Volontario PC",
    OPERATORE: "Operatore sala operativa",
}


def is_verified(role: str) -> bool:
    """True se il ruolo è una fonte accreditata (volontario/operatore)."""
    return role in VERIFIED_ROLES


def resolve_role(enrollment_code: str | None) -> str:
    """Ruolo a partire dal codice di accreditamento (None/ignoto → cittadino).

    Il confronto è esatto. Se i codici non sono configurati, ogni codice
    fornito viene ignorato e si resta cittadino (fail-safe: nessuna promozione
    accidentale).
    """
    if not enrollment_code:
        return CITTADINO
    code = enrollment_code.strip()
    if settings.enrollment_code_operatore and code == settings.enrollment_code_operatore:
        return OPERATORE
    if settings.enrollment_code_volontario and code == settings.enrollment_code_volontario:
        return VOLONTARIO
    return CITTADINO


def trust_for_role(role: str) -> float:
    """Peso di reputazione iniziale per il ruolo (config)."""
    if role == OPERATORE:
        return settings.trust_operatore
    if role == VOLONTARIO:
        return settings.trust_volontario
    return settings.trust_cittadino
