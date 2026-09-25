import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin

if TYPE_CHECKING:
    from app.modules.incidents.models import Incident


class Dispatch(CreatedAtMixin, Base):
    __tablename__ = "dispatches"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('MILK_PRODUCTION', 'GUINEA_PIG_REQUEST')",
            name="ck_dispatches_valid_source_type",
        ),
        CheckConstraint(
            "delivery_mode IN ('DIRECT_PICKUP', 'DRIVER')",
            name="ck_dispatches_valid_delivery_mode",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED')",
            name="ck_dispatches_valid_status",
        ),
        CheckConstraint("quantity > 0", name="ck_dispatches_quantity_positive"),
        CheckConstraint(
            "(source_type = 'MILK_PRODUCTION' AND milk_production_id IS NOT NULL "
            "AND guinea_pig_request_id IS NULL) OR "
            "(source_type = 'GUINEA_PIG_REQUEST' AND guinea_pig_request_id IS NOT NULL "
            "AND milk_production_id IS NULL)",
            name="ck_dispatches_source_consistency",
        ),
        CheckConstraint(
            "(delivery_mode = 'DRIVER' AND driver_actor_id IS NOT NULL) OR "
            "(delivery_mode = 'DIRECT_PICKUP' AND driver_actor_id IS NULL)",
            name="ck_dispatches_driver_consistency",
        ),
        CheckConstraint(
            "(status = 'PENDING' AND dispatched_at IS NULL AND dispatched_by_user_id IS NULL) OR "
            "(status <> 'PENDING' AND dispatched_at IS NOT NULL "
            "AND dispatched_by_user_id IS NOT NULL)",
            name="ck_dispatches_departure_consistency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispatch_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    milk_production_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("milk_productions.id"), unique=True, nullable=True
    )
    guinea_pig_request_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("guinea_pig_requests.id"), unique=True, nullable=True
    )
    center_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("centers.id"), index=True, nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(30), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)
    delivery_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    driver_actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("operational_actors.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), index=True, nullable=False, default="PENDING")
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    dispatched_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    milk_production: Mapped["MilkProduction | None"] = relationship()
    guinea_pig_request: Mapped["GuineaPigRequest | None"] = relationship()
    center: Mapped["Center"] = relationship()
    product: Mapped["Product"] = relationship()
    driver_actor: Mapped["OperationalActor | None"] = relationship()
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by_user_id])
    dispatched_by_user: Mapped["User | None"] = relationship(foreign_keys=[dispatched_by_user_id])
    reception: Mapped["Reception | None"] = relationship(back_populates="dispatch", uselist=False)

    @property
    def source_code(self) -> str:
        if self.milk_production is not None:
            return self.milk_production.lot_code
        if self.guinea_pig_request is not None:
            return self.guinea_pig_request.request_code
        return ""


class Reception(CreatedAtMixin, Base):
    __tablename__ = "receptions"
    __table_args__ = (
        CheckConstraint("received_quantity >= 0", name="ck_receptions_quantity_nonnegative"),
        CheckConstraint(
            "status IN ('CONFORMING', 'WITH_DIFFERENCE')",
            name="ck_receptions_valid_status",
        ),
        CheckConstraint(
            "difference = received_quantity - dispatched_quantity",
            name="ck_receptions_difference_equation",
        ),
        CheckConstraint(
            "(status = 'CONFORMING' AND difference = 0) OR "
            "(status = 'WITH_DIFFERENCE' AND difference <> 0)",
            name="ck_receptions_status_consistency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispatch_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dispatches.id"), unique=True, nullable=False
    )
    dispatched_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    received_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    difference: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    status: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    observation: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    dispatch: Mapped[Dispatch] = relationship(back_populates="reception")
    received_by_user: Mapped["User"] = relationship()
    incident: Mapped["Incident | None"] = relationship(back_populates="reception", uselist=False)


from app.modules.catalog.models import Center, Product  # noqa: E402
from app.modules.identity.models import OperationalActor, User  # noqa: E402
from app.modules.production.models import MilkProduction  # noqa: E402
from app.modules.requests.models import GuineaPigRequest  # noqa: E402
