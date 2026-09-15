"""Create guinea pig inventory balances and movements.

Revision ID: 20260915_0004
Revises: 20260915_0003
Create Date: 2026-09-15
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260915_0004"
down_revision: Union[str, Sequence[str], None] = "20260915_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORY_CHECK = (
    "category IN ('Adultos / reproductores H', 'Adultos / reproductores M', "
    "'Lactantes', 'Destete H', 'Destete M', 'Juvenil H', 'Juvenil M')"
)


def upgrade() -> None:
    op.create_table(
        "inventory_balances",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("center_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("physical_quantity", sa.Integer(), nullable=False),
        sa.Column("reserved_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "physical_quantity >= 0",
            name="ck_inventory_balances_physical_nonnegative",
        ),
        sa.CheckConstraint(
            "reserved_quantity >= 0",
            name="ck_inventory_balances_reserved_nonnegative",
        ),
        sa.CheckConstraint(
            "reserved_quantity <= physical_quantity",
            name="ck_inventory_balances_reserved_not_above_physical",
        ),
        sa.CheckConstraint(CATEGORY_CHECK, name="ck_inventory_balances_valid_category"),
        sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "center_id",
            "category",
            name="uq_inventory_balances_center_category",
        ),
    )
    op.create_index("ix_inventory_balances_center_id", "inventory_balances", ["center_id"])
    op.create_index("ix_inventory_balances_category", "inventory_balances", ["category"])

    op.create_table(
        "inventory_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("balance_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("center_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("movement_type", sa.String(length=20), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("physical_quantity_before", sa.Integer(), nullable=False),
        sa.Column("physical_quantity_after", sa.Integer(), nullable=False),
        sa.Column("reference_type", sa.String(length=100), nullable=True),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("registered_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "movement_type IN ('SALE', 'MORTALITY')",
            name="ck_inventory_movements_valid_type",
        ),
        sa.CheckConstraint("quantity < 0", name="ck_inventory_movements_quantity_negative"),
        sa.CheckConstraint(
            "physical_quantity_before >= 0 AND physical_quantity_after >= 0",
            name="ck_inventory_movements_stock_nonnegative",
        ),
        sa.CheckConstraint(
            "physical_quantity_after = physical_quantity_before + quantity",
            name="ck_inventory_movements_stock_equation",
        ),
        sa.CheckConstraint(CATEGORY_CHECK, name="ck_inventory_movements_valid_category"),
        sa.CheckConstraint(
            "(reference_type IS NULL) = (reference_id IS NULL)",
            name="ck_inventory_movements_reference_pair",
        ),
        sa.ForeignKeyConstraint(["balance_id"], ["inventory_balances.id"]),
        sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
        sa.ForeignKeyConstraint(["registered_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_movements_balance_id", "inventory_movements", ["balance_id"])
    op.create_index("ix_inventory_movements_center_id", "inventory_movements", ["center_id"])
    op.create_index("ix_inventory_movements_category", "inventory_movements", ["category"])
    op.create_index(
        "ix_inventory_movements_movement_type",
        "inventory_movements",
        ["movement_type"],
    )
    op.create_index(
        "ix_inventory_movements_registered_by_user_id",
        "inventory_movements",
        ["registered_by_user_id"],
    )
    op.create_index("ix_inventory_movements_occurred_at", "inventory_movements", ["occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_inventory_movements_occurred_at", table_name="inventory_movements")
    op.drop_index(
        "ix_inventory_movements_registered_by_user_id",
        table_name="inventory_movements",
    )
    op.drop_index("ix_inventory_movements_movement_type", table_name="inventory_movements")
    op.drop_index("ix_inventory_movements_category", table_name="inventory_movements")
    op.drop_index("ix_inventory_movements_center_id", table_name="inventory_movements")
    op.drop_index("ix_inventory_movements_balance_id", table_name="inventory_movements")
    op.drop_table("inventory_movements")
    op.drop_index("ix_inventory_balances_category", table_name="inventory_balances")
    op.drop_index("ix_inventory_balances_center_id", table_name="inventory_balances")
    op.drop_table("inventory_balances")
