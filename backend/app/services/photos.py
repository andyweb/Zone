"""Gestione delle foto allegate alle segnalazioni.

Storage su filesystem (directory `settings.media_dir`, montata su un volume in
compose). Le immagini vengono **re-encodate in JPEG**: questo rimuove i metadati
EXIF (privacy: una foto può contenere il GPS di scatto) e applica un downscale
per limitare banda e spazio.

NB: Pillow è importato in modo *lazy* dentro `save_report_photo`, così importare
questo modulo non richiede PIL (i test delle logiche pure restano leggeri).
"""

from __future__ import annotations

import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from ..config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _reports_dir() -> Path:
    path = Path(settings.media_dir) / "reports"
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_report_photo(upload: UploadFile) -> str:
    """Valida, re-encoda e salva la foto. Ritorna l'URL relativo da memorizzare.

    Solleva HTTPException con il giusto status su input non valido.
    """
    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="formato non supportato (ammessi: jpeg, png, webp)",
        )

    # Leggiamo al massimo max+1 byte: se supera, è troppo grande.
    raw = await upload.read(settings.photo_max_bytes + 1)
    if len(raw) > settings.photo_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="immagine troppo grande",
        )

    from PIL import Image, ImageOps  # lazy: PIL solo quando serve davvero

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)  # applica l'orientamento poi scarta EXIF
        img = img.convert("RGB")
    except Exception:  # noqa: BLE001 — qualunque immagine illeggibile è 422
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="immagine non valida",
        )

    img.thumbnail(
        (settings.photo_max_dimension, settings.photo_max_dimension)
    )  # downscale in-place mantenendo le proporzioni

    filename = f"{uuid.uuid4().hex}.jpg"
    dest = _reports_dir() / filename
    img.save(dest, format="JPEG", quality=settings.photo_jpeg_quality, optimize=True)

    return f"{settings.media_url_prefix}/reports/{filename}"


def delete_report_photo(photo_path: str | None) -> None:
    """Cancella dal disco il file di una foto (best-effort). No-op se assente."""
    if not photo_path:
        return
    name = Path(photo_path).name  # difesa da path traversal: solo il nome file
    try:
        (_reports_dir() / name).unlink(missing_ok=True)
    except OSError:
        pass
