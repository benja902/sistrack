"""Create incidents and backfill existing reception differences.

Revision ID: 20260915_0008
Revises: 20260915_0007
Create Date: 2026-09-15
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260915_0008"
down_revision: Union[str, Sequence[str], None] = "20260915_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incident_code", sa.String(length=40), nullable=False),
        sa.Column("reception_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False, server_default="OPEN"),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('OPEN', 'CLOSED')",
            name="ck_incidents_valid_status",
        ),
        sa.CheckConstraint(
            "(status = 'OPEN' AND resolution IS NULL AND closed_at IS NULL "
            "AND closed_by_user_id IS NULL) OR "
            "(status = 'CLOSED' AND resolution IS NOT NULL AND closed_at IS NOT NULL "
            "AND closed_by_user_id IS NOT NULL)",
            name="ck_incidents_close_consistency",
        ),
        sa.ForeignKeyConstraint(["reception_id"], ["receptions.id"]),
        sa.ForeignKeyConstraint(["closed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reception_id"),
    )
    op.create_index("ix_incidents_incident_code", "incidents", ["incident_code"], unique=True)
    op.create_index("ix_incidents_status", "incidents", ["status"])

    op.execute(
        sa.text(
            """
            INSERT INTO incidents (id, incident_code, reception_id, status, created_at)
            SELECT
                gen_random_uuid(),
                'INC-' || to_char(source.received_at, 'YYYYMMDD') || '-' ||
                    lpad(source.daily_sequence::text, 3, '0'),
                source.reception_id,
                'OPEN',
                source.created_at
            FROM (
                SELECT
                    receptions.id AS reception_id,
                    receptions.received_at,
                    receptions.created_at,
                    row_number() OVER (
                        PARTITION BY receptions.received_at::date
                        ORDER BY receptions.created_at, receptions.id
                    ) AS daily_sequence
                FROM receptions
                WHERE receptions.difference <> 0
            ) AS source
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO traceability_events (
                id, event_type, occurred_at, recorded_by_user_id, center_id,
                product_id, reference_type, reference_id, description, metadata
            )
            SELECT
                gen_random_uuid(),
                'incident_created',
                incidents.created_at,
                receptions.received_by_user_id,
                dispatches.center_id,
                dispatches.product_id,
                'incident',
                incidents.id,
                'Incidencia ' || incidents.incident_code ||
                    ' creada por diferencia en recepción.',
                jsonb_build_object(
                    'incident_code', incidents.incident_code,
                    'reception_id', receptions.id::text,
                    'dispatch_id', dispatches.id::text,
                    'difference', receptions.difference,
                    'status', 'OPEN'
                )
            FROM incidents
            JOIN receptions ON receptions.id = incidents.reception_id
            JOIN dispatches ON dispatches.id = receptions.dispatch_id
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM traceability_events "
            "WHERE event_type IN ('incident_created', 'incident_closed') "
            "AND reference_type = 'incident'"
        )
    )
    op.drop_index("ix_incidents_status", table_name="incidents")
    op.drop_index("ix_incidents_incident_code", table_name="incidents")
    op.drop_table("incidents")
