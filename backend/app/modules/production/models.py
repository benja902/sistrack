import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin


class MilkProduction(CreatedAtMixin, Base):
    __tablename__ = "milk_productions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lot_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    center_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("centers.id"), index=True, nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    production_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    responsible: Mapped[str] = mapped_column(String(150), nullable=False)
    total_liters: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    registered_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    center: Mapped["Center"] = relationship()
    product: Mapped["Product"] = relationship()
    registered_by_user: Mapped["User"] = relationship()
    details: Mapped[list["MilkProductionDetail"]] = relationship(
        back_populates="production",
        cascade="all, delete-orphan",
        order_by="MilkProductionDetail.created_at",
    )


class MilkProductionDetail(CreatedAtMixin, Base):
    __tablename__ = "milk_production_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    production_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("milk_productions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    animal_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    liters: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)

    production: Mapped[MilkProduction] = relationship(back_populates="details")


from app.modules.catalog.models import Center, Product  # noqa: E402
from app.modules.identity.models import User  # noqa: E402
