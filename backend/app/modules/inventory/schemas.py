from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

InventoryCategory = Literal[
    "Adultos / reproductores H",
    "Adultos / reproductores M",
    "Lactantes",
    "Destete H",
    "Destete M",
    "Juvenil H",
    "Juvenil M",
]
InventoryMovementType = Literal["SALE", "MORTALITY"]


class InventoryCenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str


class InventoryUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str


class InventoryMovementCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    center_id: UUID
    category: InventoryCategory
    movement_type: InventoryMovementType
    quantity: int = Field(lt=0)
    reference_type: str | None = Field(default=None, min_length=1, max_length=100)
    reference_id: UUID | None = None
    description: str = Field(min_length=1, max_length=500)
    occurred_at: AwareDatetime

    @field_validator("reference_type", "description")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("El texto no puede estar vacío.")
        return stripped

    @model_validator(mode="after")
    def validate_reference_pair(self) -> "InventoryMovementCreate":
        if (self.reference_type is None) != (self.reference_id is None):
            raise ValueError("El tipo y el identificador de referencia deben enviarse juntos.")
        return self


class InventoryMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    balance_id: UUID
    center: InventoryCenterRead
    category: InventoryCategory
    movement_type: InventoryMovementType
    quantity: int
    physical_quantity_before: int
    physical_quantity_after: int
    reference_type: str | None
    reference_id: UUID | None
    description: str
    registered_by_user_id: UUID
    registered_by: InventoryUserRead = Field(validation_alias="registered_by_user")
    occurred_at: datetime
    created_at: datetime


class InventoryBalanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    center: InventoryCenterRead
    category: InventoryCategory
    physical_quantity: int
    reserved_quantity: int
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def available_quantity(self) -> int:
        return self.physical_quantity - self.reserved_quantity


class InventoryBalanceDetailResponse(InventoryBalanceRead):
    movements: list[InventoryMovementRead]
