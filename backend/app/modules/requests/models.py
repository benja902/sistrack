import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditedMixin, Base, CreatedAtMixin

REQUEST_STATUSES = ("REQUESTED", "AVAILABILITY_CONFIRMED", "PAID", "AUTHORIZED")
RECEIPT_STATUSES = ("PENDING", "REGISTERED")
RESERVATION_STATUSES = ("ACTIVE", "RELEASED")


class GuineaPigRequest(AuditedMixin, Base):
    __tablename__ = "guinea_pig_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('REQUESTED', 'AVAILABILITY_CONFIRMED', 'PAID', 'AUTHORIZED')",
            name="ck_guinea_pig_requests_valid_status",
        ),
        CheckConstraint(
            "receipt_status IN ('PENDING', 'REGISTERED')",
            name="ck_guinea_pig_requests_valid_receipt_status",
        ),
        CheckConstraint(
            "requested_quantity > 0",
            name="ck_guinea_pig_requests_quantity_positive",
        ),
        CheckConstraint(
            "(receipt_status = 'PENDING' AND receipt_reference IS NULL AND paid_at IS NULL) OR "
            "(receipt_status = 'REGISTERED' AND receipt_reference IS NOT NULL "
            "AND paid_at IS NOT NULL)",
            name="ck_guinea_pig_requests_receipt_consistency",
        ),
        CheckConstraint(
            "(status = 'AUTHORIZED' AND authorized_by_user_id IS NOT NULL "
            "AND authorized_at IS NOT NULL) OR "
            "(status <> 'AUTHORIZED' AND authorized_by_user_id IS NULL AND authorized_at IS NULL)",
            name="ck_guinea_pig_requests_authorization_consistency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    inventory_balance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inventory_balances.id"), index=True, nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    requested_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    requested_for: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), index=True, nullable=False, default="REQUESTED")
    receipt_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    receipt_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    authorized_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    authorized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    inventory_balance: Mapped["InventoryBalance"] = relationship(
        foreign_keys=[inventory_balance_id]
    )
    product: Mapped["Product"] = relationship(foreign_keys=[product_id])
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by_user_id])
    authorized_by_user: Mapped["User | None"] = relationship(foreign_keys=[authorized_by_user_id])
    reservation: Mapped["InventoryReservation | None"] = relationship(
        back_populates="request", uselist=False
    )


class InventoryReservation(CreatedAtMixin, Base):
    __tablename__ = "inventory_reservations"
    __table_args__ = (
        UniqueConstraint("request_id", name="uq_inventory_reservations_request_id"),
        CheckConstraint("quantity > 0", name="ck_inventory_reservations_quantity_positive"),
        CheckConstraint(
            "status IN ('ACTIVE', 'RELEASED')",
            name="ck_inventory_reservations_valid_status",
        ),
        CheckConstraint(
            "(status = 'ACTIVE' AND released_at IS NULL) OR "
            "(status = 'RELEASED' AND released_at IS NOT NULL)",
            name="ck_inventory_reservations_release_consistency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("guinea_pig_requests.id"), nullable=False
    )
    inventory_balance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inventory_balances.id"), index=True, nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    request: Mapped[GuineaPigRequest] = relationship(back_populates="reservation")
    inventory_balance: Mapped["InventoryBalance"] = relationship(
        foreign_keys=[inventory_balance_id]
    )
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by_user_id])


from app.modules.catalog.models import Product  # noqa: E402
from app.modules.identity.models import User  # noqa: E402
from app.modules.inventory.models import InventoryBalance  # noqa: E402
