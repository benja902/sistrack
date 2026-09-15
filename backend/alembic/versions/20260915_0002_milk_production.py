"""Create milk productions and their detail records.

Revision ID: 20260915_0002
Revises: 20260914_0001
Create Date: 2026-09-15
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260915_0002"
down_revision: Union[str, Sequence[str], None] = "20260914_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TEMPORARY_USER_ID = "00000000-0000-0000-0000-000000000301"


def upgrade() -> None:
    op.create_table(
        "milk_productions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lot_code", sa.String(length=30), nullable=False),
        sa.Column("center_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("production_date", sa.Date(), nullable=False),
        sa.Column("responsible", sa.String(length=150), nullable=False),
        sa.Column("total_liters", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("registered_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("total_liters > 0", name="ck_milk_productions_total_positive"),
        sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["registered_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lot_code"),
    )
    op.create_index("ix_milk_productions_center_id", "milk_productions", ["center_id"])
    op.create_index("ix_milk_productions_production_date", "milk_productions", ["production_date"])

    op.create_table(
        "milk_production_details",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("production_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("animal_reference", sa.String(length=100), nullable=False),
        sa.Column("liters", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("liters > 0", name="ck_milk_production_details_liters_positive"),
        sa.ForeignKeyConstraint(["production_id"], ["milk_productions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_milk_production_details_production_id",
        "milk_production_details",
        ["production_id"],
    )

    op.bulk_insert(
        sa.table(
            "users",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("full_name", sa.String()),
            sa.column("email", sa.String()),
            sa.column("password_hash", sa.String()),
            sa.column("role_id", postgresql.UUID(as_uuid=True)),
            sa.column("is_active", sa.Boolean()),
        ),
        [
            {
                "id": TEMPORARY_USER_ID,
                "full_name": "Administrador temporal",
                "email": "admin.temporal@sitrack.local",
                "password_hash": None,
                "role_id": "00000000-0000-0000-0000-000000000001",
                "is_active": True,
            }
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM traceability_events "
            "WHERE reference_type = 'milk_production' AND recorded_by_user_id = :user_id"
        ).bindparams(user_id=TEMPORARY_USER_ID)
    )
    op.drop_index("ix_milk_production_details_production_id", table_name="milk_production_details")
    op.drop_table("milk_production_details")
    op.drop_index("ix_milk_productions_production_date", table_name="milk_productions")
    op.drop_index("ix_milk_productions_center_id", table_name="milk_productions")
    op.drop_table("milk_productions")
    op.execute(
        sa.text("DELETE FROM users WHERE id = :user_id").bindparams(
            user_id=TEMPORARY_USER_ID
        )
    )
