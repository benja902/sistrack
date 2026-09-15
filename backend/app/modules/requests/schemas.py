from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.inventory.schemas import InventoryBalanceRead, InventoryUserRead

RequestStatus = Literal["REQUESTED", "AVAILABILITY_CONFIRMED", "PAID", "AUTHORIZED"]
ReceiptStatus = Literal["PENDING", "REGISTERED"]
ReservationStatus = Literal["ACTIVE", "RELEASED"]


class GuineaPigRequestCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inventory_balance_id: UUID
    customer_name: str = Field(min_length=2, max_length=150)
    requested_quantity: int = Field(gt=0)
    requested_for: date

    @field_validator("customer_name")
    @classmethod
    def strip_customer_name(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 2:
            raise ValueError("El nombre del cliente debe tener al menos dos caracteres.")
        return stripped


class PaymentRegistration(BaseModel):
    model_config = ConfigDict(extra="forbid")

    receipt_reference: str = Field(min_length=1, max_length=100)

    @field_validator("receipt_reference")
    @classmethod
    def strip_receipt_reference(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("La referencia de boleta es obligatoria.")
        return stripped


class InventoryReservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quantity: int
    status: ReservationStatus
    created_at: datetime
    released_at: datetime | None


class GuineaPigRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_code: str
    inventory_balance: InventoryBalanceRead
    customer_name: str
    requested_quantity: int
    requested_for: date
    status: RequestStatus
    receipt_status: ReceiptStatus
    receipt_reference: str | None
    created_by_user: InventoryUserRead
    authorized_by_user: InventoryUserRead | None
    paid_at: datetime | None
    authorized_at: datetime | None
    created_at: datetime
    updated_at: datetime
    reservation: InventoryReservationRead | None
