from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

SourceType = Literal["MILK_PRODUCTION", "GUINEA_PIG_REQUEST"]
DeliveryMode = Literal["DIRECT_PICKUP", "DRIVER"]
DispatchStatus = Literal["PENDING", "IN_TRANSIT", "COMPLETED"]
ReceptionStatus = Literal["CONFORMING", "WITH_DIFFERENCE"]


class DispatchCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: SourceType
    source_id: UUID
    destination: str = Field(min_length=2, max_length=150)
    delivery_mode: DeliveryMode
    driver_name: str | None = Field(default=None, min_length=2, max_length=150)

    @field_validator("destination", "driver_name")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def validate_driver(self) -> "DispatchCreate":
        if self.delivery_mode == "DRIVER" and self.driver_name is None:
            raise ValueError("Debe registrar al conductor que tendrá la custodia física.")
        if self.delivery_mode == "DIRECT_PICKUP" and self.driver_name is not None:
            raise ValueError("El retiro directo no debe tener conductor.")
        return self


class ReceptionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    received_quantity: Decimal = Field(ge=0, max_digits=12, decimal_places=3)
    received_at: AwareDatetime
    observation: str | None = Field(default=None, max_length=500)

    @field_validator("observation")
    @classmethod
    def strip_observation(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class LogisticsCenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str
    name: str


class LogisticsProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sku: str
    name: str
    unit_of_measure: str


class LogisticsUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str


class LogisticsActorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str


class ReceptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    dispatched_quantity: Decimal
    received_quantity: Decimal
    difference: Decimal
    status: ReceptionStatus
    observation: str | None
    received_by_user: LogisticsUserRead
    received_at: datetime
    created_at: datetime


class DispatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    dispatch_code: str
    source_type: SourceType
    source_code: str
    milk_production_id: UUID | None
    guinea_pig_request_id: UUID | None
    center: LogisticsCenterRead
    product: LogisticsProductRead
    quantity: Decimal
    unit_of_measure: str
    destination: str
    delivery_mode: DeliveryMode
    driver_actor: LogisticsActorRead | None
    status: DispatchStatus
    created_by_user: LogisticsUserRead
    dispatched_by_user: LogisticsUserRead | None
    dispatched_at: datetime | None
    created_at: datetime
    reception: ReceptionRead | None
