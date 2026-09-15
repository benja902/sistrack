"""Create the guinea pig requests MVP workflow.

Revision ID: 20260915_0005
Revises: 20260915_0004
Create Date: 2026-09-15
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260915_0005"
down_revision: Union[str, Sequence[str], None] = "20260915_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "guinea_pig_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_code", sa.String(length=40), nullable=False),
        sa.Column("inventory_balance_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_name", sa.String(length=150), nullable=False),
        sa.Column("requested_quantity", sa.Integer(), nullable=False),
        sa.Column("requested_for", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="REQUESTED"),
        sa.Column("receipt_status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("receipt_reference", sa.String(length=100), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("authorized_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("authorized_at", sa.DateTime(timezone=True), nullable=True),
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
            "requested_quantity > 0", name="ck_guinea_pig_requests_quantity_positive"
        ),
        sa.CheckConstraint(
            "status IN ('REQUESTED', 'AVAILABILITY_CONFIRMED', 'PAID', 'AUTHORIZED')",
            name="ck_guinea_pig_requests_valid_status",
        ),
        sa.CheckConstraint(
            "receipt_status IN ('PENDING', 'REGISTERED')",
            name="ck_guinea_pig_requests_valid_receipt_status",
        ),
        sa.CheckConstraint(
            "(receipt_status = 'PENDING' AND receipt_reference IS NULL AND paid_at IS NULL) OR "
            "(receipt_status = 'REGISTERED' AND receipt_reference IS NOT NULL AND paid_at IS NOT NULL)",
            name="ck_guinea_pig_requests_receipt_consistency",
        ),
        sa.CheckConstraint(
            "(status = 'AUTHORIZED' AND authorized_by_user_id IS NOT NULL AND authorized_at IS NOT NULL) OR "
            "(status <> 'AUTHORIZED' AND authorized_by_user_id IS NULL AND authorized_at IS NULL)",
            name="ck_guinea_pig_requests_authorization_consistency",
        ),
        sa.ForeignKeyConstraint(["inventory_balance_id"], ["inventory_balances.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["authorized_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_code"),
    )
    op.create_index(
        "ix_guinea_pig_requests_request_code", "guinea_pig_requests", ["request_code"], unique=True
    )
    op.create_index(
        "ix_guinea_pig_requests_inventory_balance_id",
        "guinea_pig_requests",
        ["inventory_balance_id"],
    )
    op.create_index(
        "ix_guinea_pig_requests_created_by_user_id", "guinea_pig_requests", ["created_by_user_id"]
    )
    op.create_index("ix_guinea_pig_requests_status", "guinea_pig_requests", ["status"])

    op.create_table(
        "inventory_reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inventory_balance_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("quantity > 0", name="ck_inventory_reservations_quantity_positive"),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'RELEASED')", name="ck_inventory_reservations_valid_status"
        ),
        sa.CheckConstraint(
            "(status = 'ACTIVE' AND released_at IS NULL) OR (status = 'RELEASED' AND released_at IS NOT NULL)",
            name="ck_inventory_reservations_release_consistency",
        ),
        sa.ForeignKeyConstraint(["request_id"], ["guinea_pig_requests.id"]),
        sa.ForeignKeyConstraint(["inventory_balance_id"], ["inventory_balances.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id", name="uq_inventory_reservations_request_id"),
    )
    op.create_index(
        "ix_inventory_reservations_inventory_balance_id",
        "inventory_reservations",
        ["inventory_balance_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_inventory_reservations_inventory_balance_id", table_name="inventory_reservations"
    )
    op.drop_table("inventory_reservations")
    op.drop_index("ix_guinea_pig_requests_status", table_name="guinea_pig_requests")
    op.drop_index("ix_guinea_pig_requests_created_by_user_id", table_name="guinea_pig_requests")
    op.drop_index("ix_guinea_pig_requests_inventory_balance_id", table_name="guinea_pig_requests")
    op.drop_index("ix_guinea_pig_requests_request_code", table_name="guinea_pig_requests")
    op.drop_table("guinea_pig_requests")
