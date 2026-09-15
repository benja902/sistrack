"""Remove the redundant request code unique constraint.

Revision ID: 20260915_0006
Revises: 20260915_0005
Create Date: 2026-09-15
"""

from collections.abc import Sequence
from typing import Union

from alembic import op

revision: str = "20260915_0006"
down_revision: Union[str, Sequence[str], None] = "20260915_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "guinea_pig_requests_request_code_key",
        "guinea_pig_requests",
        type_="unique",
    )


def downgrade() -> None:
    op.create_unique_constraint(
        "guinea_pig_requests_request_code_key",
        "guinea_pig_requests",
        ["request_code"],
    )
