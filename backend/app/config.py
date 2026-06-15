"""Configurazione centralizzata.

REGOLA (brief, sezione 11): TUTTI i parametri configurabili vivono qui.
Niente valori magici sparsi nel codice: TTL, soglie, raggi, rate limit.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    app_name: str = "App segnalazioni live"
    debug: bool = False

    # --- Database ---
    # URL async per SQLAlchemy/asyncpg. In docker-compose il default punta al
    # servizio "db". Override via env DATABASE_URL.
    database_url: str = (
        "postgresql+asyncpg://app:app@localhost:5432/segnalazioni"
    )

    # --- Auth / JWT ---
    jwt_secret: str = "CHANGE_ME_in_.env"  # MAI il default in produzione
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 60 * 24  # 24h

    # --- TTL dinamico (sezione 4.1) ---
    # Estensione/accorciamento ad ogni voto. Il delta effettivo viene pesato
    # per il trust_score di chi vota.
    ttl_confirm_extend_minutes: int = 30   # +30 min per conferma (base)
    ttl_denial_shorten_minutes: int = 45   # -45 min per smentita (base)
    ttl_floor_minutes: int = 15            # mai sotto 15 min di vita residua
    ttl_ceiling_minutes: int = 12 * 60     # mai sopra 12 h di vita residua

    # --- Anti-abuso (sezione 4.2) ---
    removal_denial_threshold: int = 3      # SOGLIA_SMENTITE
    reports_per_hour_limit: int = 5        # rate limit creazione
    # Anti-spam di prossimità: stessa categoria entro R metri e finestra T min.
    proximity_block_radius_m: int = 100
    proximity_block_window_minutes: int = 30

    # --- Query nearby ---
    nearby_default_radius_m: int = 1000
    nearby_max_radius_m: int = 10000

    # --- Job di scadenza (sezione 4.3) ---
    expiry_job_interval_minutes: int = 5

    # --- Push (sezione 5.3) — dietro flag, implementata dopo il core ---
    push_enabled: bool = False
    push_radius_m: int = 1500
    # Non inviare push verso una posizione "stantia": se l'ultima posizione
    # nota dell'utente è più vecchia di questo, lo si esclude (privacy + rumore).
    push_location_max_age_minutes: int = 60
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"

    # --- Foto segnalazioni ---
    # Directory di storage (montata su un volume in compose) e prefisso URL con
    # cui le foto sono servite (StaticFiles). Le immagini sono re-encodate in
    # JPEG: questo rimuove i metadati EXIF (privacy: niente GPS nascosto).
    media_dir: str = "/app/media"
    media_url_prefix: str = "/media"
    photo_max_bytes: int = 6 * 1024 * 1024   # 6 MB sull'upload grezzo
    photo_max_dimension: int = 1600          # lato lungo max dopo il downscale
    photo_jpeg_quality: int = 82

    # --- Ruoli / accreditamento (verticale Protezione Civile) ---
    # Codici distribuiti dall'ente per accreditare volontari/operatori in fase
    # di registrazione. Se None, nessuno può ottenere quel ruolo (fail-safe).
    enrollment_code_volontario: str | None = None
    enrollment_code_operatore: str | None = None
    # Peso di reputazione iniziale per ruolo (pesa i voti: vedi vote_report).
    trust_cittadino: float = 1.0
    trust_volontario: float = 2.0
    trust_operatore: float = 3.0

    # --- Moderazione (sezione 8) — pre-rilascio ---
    # Filtro sul testo libero delle note (blocklist in app/moderation.py) e
    # segnalazione abusi ("flag" di una segnalazione) con auto-rimozione.
    moderation_enabled: bool = True
    # Numero di segnalazioni-abuso DISTINTE oltre il quale una segnalazione
    # viene auto-rimossa (status='removed') in attesa di revisione.
    moderation_flag_threshold: int = 3

    # --- Retention / GDPR (sezione 8) ---
    # Le segnalazioni scadute/rimosse vengono CANCELLATE (non solo marcate)
    # dopo questa finestra: minimizzazione dei dati. La finestra dà tempo ai
    # client di riconciliare lo stato prima della cancellazione definitiva.
    retention_delete_after_minutes: int = 24 * 60  # 24h dopo la scadenza
    retention_job_interval_minutes: int = 60

    # --- SSE ---
    sse_keepalive_seconds: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
