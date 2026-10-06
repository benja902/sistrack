"""Add optional AI audit logs; deployment applies this migration explicitly.

Revision ID: 20261002_0009
Revises: 20260915_0008
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20261002_0009"
down_revision = "20260915_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rf_code", sa.String(20), nullable=False),
        sa.Column("context_type", sa.String(20), nullable=False),
        sa.Column("context_reference", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("fallback_used", sa.Boolean(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("status IN ('success', 'fallback', 'error')", name="ck_ai_logs_status"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("ai_logs")
