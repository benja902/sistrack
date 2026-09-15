from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

BUSINESS_TIME_ZONE = ZoneInfo("America/Lima")


class MilkProductionDetailCreate(BaseModel):
    animal_reference: str = Field(min_length=1, max_length=100)
    liters: Decimal = Field(gt=0, max_digits=12, decimal_places=3)

    @field_validator("animal_reference")
    @classmethod
    def strip_animal_reference(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("La referencia del animal es obligatoria.")
        return value.strip()


class MilkProductionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    production_date: date
    center_id: UUID
    responsible_actor_id: UUID
    details: list[MilkProductionDetailCreate] = Field(min_length=1)

    @field_validator("production_date")
    @classmethod
    def reject_future_production_date(cls, value: date) -> date:
        if value > datetime.now(BUSINESS_TIME_ZONE).date():
            raise ValueError("La fecha de producción no puede ser futura.")
        return value

    @model_validator(mode="after")
    def reject_duplicate_animal_references(self) -> "MilkProductionCreate":
        normalized_references = [detail.animal_reference.casefold() for detail in self.details]
        if len(normalized_references) != len(set(normalized_references)):
            raise ValueError(
                "Una referencia de vaca no puede repetirse dentro de la misma producción."
            )
        return self


class ProductionCenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str


class ProductionProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    name: str
    unit_of_measure: str


class ProductionActorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str


class ProductionUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str


class MilkProductionDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    animal_reference: str
    liters: Decimal
    created_at: datetime


class MilkProductionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lot_code: str
    production_date: date
    responsible: str
    responsible_actor: ProductionActorRead | None
    total_liters: Decimal
    registered_by_user_id: UUID
    registered_by: ProductionUserRead = Field(validation_alias="registered_by_user")
    created_at: datetime
    center: ProductionCenterRead
    product: ProductionProductRead


class MilkProductionDetailResponse(MilkProductionRead):
    details: list[MilkProductionDetailRead]
