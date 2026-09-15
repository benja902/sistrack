"""Create the phase-one master entities and immutable traceability events.

Revision ID: 20260914_0001
Revises:
Create Date: 2026-09-14
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260914_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_roles_code", "roles", ["code"], unique=False)

    op.create_table(
        "centers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_centers_code", "centers", ["code"], unique=False)

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sku", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("unit_of_measure", sa.String(length=30), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku"),
    )
    op.create_index("ix_products_sku", "products", ["sku"], unique=False)

    op.create_table(
        "operational_actors",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("document_number", sa.String(length=30), nullable=True),
        sa.Column("contact_phone", sa.String(length=30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_number"),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "traceability_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("recorded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operational_actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("center_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reference_type", sa.String(length=100), nullable=True),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint(
            "(reference_type IS NULL) = (reference_id IS NULL)",
            name="ck_traceability_events_reference_pair",
        ),
        sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
        sa.ForeignKeyConstraint(["operational_actor_id"], ["operational_actors.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_traceability_events_event_type", "traceability_events", ["event_type"], unique=False
    )

    op.bulk_insert(
        sa.table(
            "roles",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("code", sa.String()),
            sa.column("name", sa.String()),
            sa.column("description", sa.String()),
            sa.column("is_active", sa.Boolean()),
        ),
        [
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "code": "ADMINISTRADOR",
                "name": "Administrador / Supervisor",
                "description": "Administración, consultas, incidencias y reportes.",
                "is_active": True,
            },
            {
                "id": "00000000-0000-0000-0000-000000000002",
                "code": "PRODUCCION",
                "name": "Personal de producción",
                "description": "Registra productos generados.",
                "is_active": True,
            },
            {
                "id": "00000000-0000-0000-0000-000000000003",
                "code": "DESPACHO",
                "name": "Personal de despacho",
                "description": "Registra salidas y despachos.",
                "is_active": True,
            },
            {
                "id": "00000000-0000-0000-0000-000000000004",
                "code": "PUNTO_VENTA",
                "name": "Personal de punto de venta",
                "description": "Registra recepciones y observaciones.",
                "is_active": True,
            },
        ],
    )
    op.bulk_insert(
        sa.table(
            "centers",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("code", sa.String()),
            sa.column("name", sa.String()),
            sa.column("is_active", sa.Boolean()),
        ),
        [
            {
                "id": "00000000-0000-0000-0000-000000000101",
                "code": "KOTOSH",
                "name": "Kotosh",
                "is_active": True,
            },
            {
                "id": "00000000-0000-0000-0000-000000000102",
                "code": "CANCHAN",
                "name": "Canchán",
                "is_active": True,
            },
        ],
    )
    op.bulk_insert(
        sa.table(
            "products",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("sku", sa.String()),
            sa.column("name", sa.String()),
            sa.column("unit_of_measure", sa.String()),
            sa.column("is_active", sa.Boolean()),
        ),
        [
            {
                "id": "00000000-0000-0000-0000-000000000201",
                "sku": "LECHE",
                "name": "Leche",
                "unit_of_measure": "L",
                "is_active": True,
            },
            {
                "id": "00000000-0000-0000-0000-000000000202",
                "sku": "CUYES",
                "name": "Cuyes",
                "unit_of_measure": "ejemplares",
                "is_active": True,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_traceability_events_event_type", table_name="traceability_events")
    op.drop_table("traceability_events")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("operational_actors")
    op.drop_index("ix_products_sku", table_name="products")
    op.drop_table("products")
    op.drop_index("ix_centers_code", table_name="centers")
    op.drop_table("centers")
    op.drop_index("ix_roles_code", table_name="roles")
    op.drop_table("roles")
