import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TraceabilityEvent(Base):
    """Append-only evidence of an operational occurrence.

    The person recording the event is always a system user. The optional
    operational actor represents the person physically involved, such as a
    driver with custody of a dispatch, and never grants platform access.
    """

    __tablename__ = "traceability_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    operational_actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("operational_actors.id"), nullable=True
    )
    center_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("centers.id"), nullable=False)
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB, nullable=True)

    recorded_by_user: Mapped["User"] = relationship(
        back_populates="registered_events",
        foreign_keys=[recorded_by_user_id],
    )
    operational_actor: Mapped["OperationalActor | None"] = relationship(
        back_populates="related_events",
        foreign_keys=[operational_actor_id],
    )
    center: Mapped["Center"] = relationship(back_populates="traceability_events")
    product: Mapped["Product | None"] = relationship(back_populates="traceability_events")


from app.modules.catalog.models import Center, Product  # noqa: E402
from app.modules.identity.models import OperationalActor, User  # noqa: E402
