"""ruoli utente e author_role sui report (verticale Protezione Civile)

Aggiunge `users.role` e `reports.author_role` (cittadino|volontario|operatore),
default 'cittadino'. L'accreditamento avviene in registrazione via codice
(app/roles.py); `author_role` è denormalizzato per il badge "verificata".

Revision ID: 0004_roles
Revises: 0003_report_flags
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_roles"
down_revision = "0003_report_flags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=False,
            server_default="cittadino",
        ),
    )
    op.add_column(
        "reports",
        sa.Column(
            "author_role",
            sa.String(length=20),
            nullable=False,
            server_default="cittadino",
        ),
    )


def downgrade() -> None:
    op.drop_column("reports", "author_role")
    op.drop_column("users", "role")
