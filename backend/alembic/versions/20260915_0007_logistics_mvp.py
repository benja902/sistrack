"""Create minimal dispatches and receptions.

Revision ID: 20260915_0007
Revises: 20260915_0006
Create Date: 2026-09-15
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260915_0007"
down_revision: Union[str, Sequence[str], None] = "20260915_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dispatches",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dispatch_code", sa.String(length=40), nullable=False),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("milk_production_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("guinea_pig_request_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("center_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("unit_of_measure", sa.String(length=30), nullable=False),
        sa.Column("destination", sa.String(length=150), nullable=False),
        sa.Column("delivery_mode", sa.String(length=20), nullable=False),
        sa.Column("driver_actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dispatched_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "source_type IN ('MILK_PRODUCTION', 'GUINEA_PIG_REQUEST')",
            name="ck_dispatches_valid_source_type",
        ),
        sa.CheckConstraint(
            "delivery_mode IN ('DIRECT_PICKUP', 'DRIVER')", name="ck_dispatches_valid_delivery_mode"
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED')", name="ck_dispatches_valid_status"
        ),
        sa.CheckConstraint("quantity > 0", name="ck_dispatches_quantity_positive"),
        sa.CheckConstraint(
            "(source_type = 'MILK_PRODUCTION' AND milk_production_id IS NOT NULL AND guinea_pig_request_id IS NULL) OR (source_type = 'GUINEA_PIG_REQUEST' AND guinea_pig_request_id IS NOT NULL AND milk_production_id IS NULL)",
            name="ck_dispatches_source_consistency",
        ),
        sa.CheckConstraint(
            "(delivery_mode = 'DRIVER' AND driver_actor_id IS NOT NULL) OR (delivery_mode = 'DIRECT_PICKUP' AND driver_actor_id IS NULL)",
            name="ck_dispatches_driver_consistency",
        ),
        sa.CheckConstraint(
            "(status = 'PENDING' AND dispatched_at IS NULL AND dispatched_by_user_id IS NULL) OR (status <> 'PENDING' AND dispatched_at IS NOT NULL AND dispatched_by_user_id IS NOT NULL)",
            name="ck_dispatches_departure_consistency",
        ),
        sa.ForeignKeyConstraint(["milk_production_id"], ["milk_productions.id"]),
        sa.ForeignKeyConstraint(["guinea_pig_request_id"], ["guinea_pig_requests.id"]),
        sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["driver_actor_id"], ["operational_actors.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["dispatched_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("milk_production_id"),
        sa.UniqueConstraint("guinea_pig_request_id"),
    )
    op.create_index("ix_dispatches_dispatch_code", "dispatches", ["dispatch_code"], unique=True)
    op.create_index("ix_dispatches_center_id", "dispatches", ["center_id"])
    op.create_index("ix_dispatches_status", "dispatches", ["status"])

    op.create_table(
        "receptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dispatch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dispatched_quantity", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("received_quantity", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("difference", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("observation", sa.Text(), nullable=True),
        sa.Column("received_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("received_quantity >= 0", name="ck_receptions_quantity_nonnegative"),
        sa.CheckConstraint(
            "status IN ('CONFORMING', 'WITH_DIFFERENCE')", name="ck_receptions_valid_status"
        ),
        sa.CheckConstraint(
            "difference = received_quantity - dispatched_quantity",
            name="ck_receptions_difference_equation",
        ),
        sa.CheckConstraint(
            "(status = 'CONFORMING' AND difference = 0) OR (status = 'WITH_DIFFERENCE' AND difference <> 0)",
            name="ck_receptions_status_consistency",
        ),
        sa.ForeignKeyConstraint(["dispatch_id"], ["dispatches.id"]),
        sa.ForeignKeyConstraint(["received_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dispatch_id"),
    )
    op.create_index("ix_receptions_status", "receptions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_receptions_status", table_name="receptions")
    op.drop_table("receptions")
    op.drop_index("ix_dispatches_status", table_name="dispatches")
    op.drop_index("ix_dispatches_center_id", table_name="dispatches")
    op.drop_index("ix_dispatches_dispatch_code", table_name="dispatches")
    op.drop_table("dispatches")
