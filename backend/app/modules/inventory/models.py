import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditedMixin, Base, CreatedAtMixin

INVENTORY_CATEGORIES = (
    "Adultos / reproductores H",
    "Adultos / reproductores M",
    "Lactantes",
    "Destete H",
    "Destete M",
    "Juvenil H",
    "Juvenil M",
)
INVENTORY_MOVEMENT_TYPES = ("SALE", "MORTALITY")


class InventoryBalance(AuditedMixin, Base):
    __tablename__ = "inventory_balances"
    __table_args__ = (
        UniqueConstraint("center_id", "category", name="uq_inventory_balances_center_category"),
        CheckConstraint(
            "physical_quantity >= 0",
            name="ck_inventory_balances_physical_nonnegative",
        ),
        CheckConstraint(
            "reserved_quantity >= 0",
            name="ck_inventory_balances_reserved_nonnegative",
        ),
        CheckConstraint(
            "reserved_quantity <= physical_quantity",
            name="ck_inventory_balances_reserved_not_above_physical",
        ),
        CheckConstraint(
            "category IN ('Adultos / reproductores H', 'Adultos / reproductores M', "
            "'Lactantes', 'Destete H', 'Destete M', 'Juvenil H', 'Juvenil M')",
            name="ck_inventory_balances_valid_category",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    center_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("centers.id"), index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    physical_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    center: Mapped["Center"] = relationship()


class InventoryMovement(CreatedAtMixin, Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('SALE', 'MORTALITY')",
            name="ck_inventory_movements_valid_type",
        ),
        CheckConstraint("quantity < 0", name="ck_inventory_movements_quantity_negative"),
        CheckConstraint(
            "physical_quantity_before >= 0 AND physical_quantity_after >= 0",
            name="ck_inventory_movements_stock_nonnegative",
        ),
        CheckConstraint(
            "physical_quantity_after = physical_quantity_before + quantity",
            name="ck_inventory_movements_stock_equation",
        ),
        CheckConstraint(
            "category IN ('Adultos / reproductores H', 'Adultos / reproductores M', "
            "'Lactantes', 'Destete H', 'Destete M', 'Juvenil H', 'Juvenil M')",
            name="ck_inventory_movements_valid_category",
        ),
        CheckConstraint(
            "(reference_type IS NULL) = (reference_id IS NULL)",
            name="ck_inventory_movements_reference_pair",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    balance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inventory_balances.id"), index=True, nullable=False
    )
    center_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("centers.id"), index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    movement_type: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    physical_quantity_before: Mapped[int] = mapped_column(Integer, nullable=False)
    physical_quantity_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    registered_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )

    center: Mapped["Center"] = relationship(foreign_keys=[center_id])
    balance: Mapped[InventoryBalance] = relationship(foreign_keys=[balance_id])
    registered_by_user: Mapped["User"] = relationship(foreign_keys=[registered_by_user_id])


from app.modules.catalog.models import Center  # noqa: E402
from app.modules.identity.models import User  # noqa: E402
