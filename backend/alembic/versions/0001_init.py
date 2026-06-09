"""schema iniziale: postgis, users, reports, report_votes

Revision ID: 0001_init
Revises:
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "trust_score", sa.Numeric(), nullable=False, server_default="1.0"
        ),
        sa.Column("expo_push_token", sa.String(length=255), nullable=True),
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("note", sa.String(length=280), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.Geography(
                geometry_type="POINT", srid=4326, spatial_index=False
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("denials", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status", sa.String(length=12), nullable=False, server_default="active"
        ),
    )
    op.create_index(
        "idx_reports_geom",
        "reports",
        ["geom"],
        postgresql_using="gist",
    )
    op.create_index(
        "idx_reports_active", "reports", ["status", "expires_at"]
    )

    op.create_table(
        "report_votes",
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
        sa.Column("vote", sa.SmallInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("report_votes")
    op.drop_index("idx_reports_active", table_name="reports")
    op.drop_index("idx_reports_geom", table_name="reports")
    op.drop_table("reports")
    op.drop_table("users")
