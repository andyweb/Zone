"""foto allegata alla segnalazione (reports.photo_path)

Aggiunge `reports.photo_path` (URL relativo, es. /media/reports/<uuid>.jpg).
I file vivono su un volume montato (vedi docker-compose); il DB tiene solo il
riferimento. Le immagini sono re-encodate in JPEG (strip EXIF, downscale).

Revision ID: 0005_report_photo
Revises: 0004_roles
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_report_photo"
down_revision = "0004_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reports",
        sa.Column("photo_path", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reports", "photo_path")
