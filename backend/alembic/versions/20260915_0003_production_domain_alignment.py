"""Align milk production with approved functional rules.

Revision ID: 20260915_0003
Revises: 20260915_0002
Create Date: 2026-09-15
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260915_0003"
down_revision: Union[str, Sequence[str], None] = "20260915_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VILMA_ACTOR_ID = "00000000-0000-0000-0000-000000000401"
JUAN_ACTOR_ID = "00000000-0000-0000-0000-000000000402"


def upgrade() -> None:
    op.add_column(
        "milk_productions",
        sa.Column("responsible_actor_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_milk_productions_responsible_actor_id",
        "milk_productions",
        "operational_actors",
        ["responsible_actor_id"],
        ["id"],
    )
    op.create_index(
        "ix_milk_productions_responsible_actor_id",
        "milk_productions",
        ["responsible_actor_id"],
    )
    op.create_index(
        "uq_milk_production_details_production_animal_reference_ci",
        "milk_production_details",
        ["production_id", sa.text("lower(animal_reference)")],
        unique=True,
    )

    op.execute(
        sa.text(
            """
            INSERT INTO operational_actors (id, full_name, is_active)
            SELECT CAST(:actor_id AS uuid), :full_name, true
            WHERE NOT EXISTS (
                SELECT 1 FROM operational_actors
                WHERE lower(trim(full_name)) = lower(trim(:full_name))
            )
            """
        ).bindparams(actor_id=VILMA_ACTOR_ID, full_name="Vilma")
    )
    op.execute(
        sa.text(
            """
            INSERT INTO operational_actors (id, full_name, is_active)
            SELECT CAST(:actor_id AS uuid), :full_name, true
            WHERE NOT EXISTS (
                SELECT 1 FROM operational_actors
                WHERE lower(trim(full_name)) = lower(trim(:full_name))
            )
            """
        ).bindparams(actor_id=JUAN_ACTOR_ID, full_name="Juan")
    )
    op.execute(
        sa.text(
            """
            UPDATE milk_productions AS production
            SET responsible_actor_id = actor.id
            FROM operational_actors AS actor
            WHERE production.responsible_actor_id IS NULL
              AND lower(trim(production.responsible)) = lower(trim(actor.full_name))
            """
        )
    )


def downgrade() -> None:
    op.drop_index(
        "uq_milk_production_details_production_animal_reference_ci",
        table_name="milk_production_details",
    )
    op.drop_index(
        "ix_milk_productions_responsible_actor_id",
        table_name="milk_productions",
    )
    op.drop_constraint(
        "fk_milk_productions_responsible_actor_id",
        "milk_productions",
        type_="foreignkey",
    )
    op.drop_column("milk_productions", "responsible_actor_id")
