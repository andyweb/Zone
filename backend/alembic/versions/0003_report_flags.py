"""segnalazione abusi: tabella report_flags (M6, sezione 8)

Aggiunge `report_flags` per la moderazione community ("report di un report").
Una flag per utente per segnalazione (PK composta). I flag spariscono con la
segnalazione (ON DELETE CASCADE su report_id) e con la cancellazione account
(gestita applicativamente in app/services/account.py).

Revision ID: 0003_report_flags
Revises: 0002_user_location_retention
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_report_flags"
down_revision = "0002_user_location_retention"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report_flags",
        sa.Column(
            "report_id",
            sa.BigInteger(),
            sa.ForeignKey("reports.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id"),
            primary_key=True,
        ),
        sa.Column("reason", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("report_flags")
