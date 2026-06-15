"""Moderazione del testo libero (note) — sezione 8, pre-rilascio.

Filtro su una lista di termini vietati (blocklist) applicato alle note in
creazione e modifica. La normalizzazione neutralizza le evasioni più comuni
(maiuscole, accenti, leetspeak, lettere ripetute, separatori inseriti) senza
pretendere di essere un sistema di moderazione completo.

NB: come per le categorie, la BLOCKLIST qui è un PLACEHOLDER ridotto e va
curata/estesa come decisione di prodotto e legale prima del rilascio pubblico
(va inclusa anche la terminologia d'odio per la giurisdizione di destinazione).
Il sistema regge qualunque lista: per cambiarla basta modificare BLOCKLIST,
nessun'altra parte del codice contiene termini hard-coded.
"""

from __future__ import annotations

import re
import unicodedata

# Sostituzioni leetspeak -> lettera (per neutralizzare "c4zz0", "$tronzo", ...)
_LEET = str.maketrans(
    {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
        "$": "s",
        "€": "e",
    }
)

# Blocklist PLACEHOLDER (italiano) — turpiloquio comune. Curare/estendere prima
# del rilascio pubblico aggiungendo la terminologia d'odio (decisione legale).
# Solo termini >= 4 caratteri per ridurre i falsi positivi nel match "despaziato".
BLOCKLIST: frozenset[str] = frozenset(
    {
        "cazzo",
        "stronzo",
        "stronza",
        "merda",
        "vaffanculo",
        "puttana",
        "troia",
        "coglione",
        "bastardo",
        "figliodiputtana",
        "minchia",
        "porcodio",
    }
)

_WORD_RE = re.compile(r"[a-z]+")
_NON_ALPHA_RE = re.compile(r"[^a-z]")
_RUN_RE = re.compile(r"(.)\1+")


def normalize(text: str) -> str:
    """Forma normalizzata per il confronto: minuscole, senza accenti, leet
    risolto, run di lettere ripetute collassate a 1 (così `caaaazzo` e `cazzo`
    coincidono). La blocklist viene collassata allo stesso modo (vedi sotto),
    quindi i doppi legittimi non causano mancati match."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower().translate(_LEET)
    return _RUN_RE.sub(r"\1", text)


# Mappa {forma normalizzata -> termine originale}: il match avviene sulla forma
# collassata, ma riportiamo il termine originale (uso diagnostico/log).
_BLOCKLIST_NORM: dict[str, str] = {normalize(term): term for term in BLOCKLIST}


def find_blocked(text: str | None) -> list[str]:
    """Termini della blocklist trovati nel testo (lista, eventualmente vuota).

    Match su due livelli: per token intero e su una versione "despaziata"
    (senza separatori) per catturare le evasioni tipo `c-a-z-z-o`.
    """
    if not text:
        return []
    norm = normalize(text)
    tokens = set(_WORD_RE.findall(norm))
    # Despaziato e ri-collassato: i separatori (c-a-z-z-o) sciolgono i doppi che
    # vanno ricollassati per coincidere con la blocklist normalizzata.
    despaced = _RUN_RE.sub(r"\1", _NON_ALPHA_RE.sub("", norm))
    return [
        original
        for collapsed, original in _BLOCKLIST_NORM.items()
        if collapsed in tokens or collapsed in despaced
    ]


def is_clean(text: str | None) -> bool:
    """True se il testo non contiene termini vietati."""
    return not find_blocked(text)
