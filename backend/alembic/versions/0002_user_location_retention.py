"""posizione utente per push geolocalizzate (M5)

Aggiunge a `users` l'ultima posizione nota (`last_location` geography +
`last_location_at`) usata solo per filtrare le notifiche push per raggio
(sezione 5.3). La retention dei report scaduti non richiede nuove colonne:
il job di purge cancella le righe esistenti (vedi app/jobs.py).

Revision ID: 0002_user_location_retention
Revises: 0001_init
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision = "0002_user_location_retention"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "last_location",
            geoalchemy2.Geography(
                geometry_type="POINT", srid=4326, spatial_index=False
            ),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "last_location_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        "idx_users_last_location",
        "users",
        ["last_location"],
        postgresql_using="gist",
    )


def downgrade() -> None:
    op.drop_index("idx_users_last_location", table_name="users")
    op.drop_column("users", "last_location_at")
    op.drop_column("users", "last_location")
