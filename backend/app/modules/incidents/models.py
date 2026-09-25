import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin

if TYPE_CHECKING:
    from app.modules.logistics.models import Reception


class Incident(CreatedAtMixin, Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'CLOSED')",
            name="ck_incidents_valid_status",
        ),
        CheckConstraint(
            "(status = 'OPEN' AND resolution IS NULL AND closed_at IS NULL "
            "AND closed_by_user_id IS NULL) OR "
            "(status = 'CLOSED' AND resolution IS NOT NULL AND closed_at IS NOT NULL "
            "AND closed_by_user_id IS NOT NULL)",
            name="ck_incidents_close_consistency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    reception_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("receptions.id"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(10), index=True, nullable=False, default="OPEN")
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    reception: Mapped["Reception"] = relationship(back_populates="incident")
    closed_by_user: Mapped["User | None"] = relationship()


from app.modules.identity.models import User  # noqa: E402
