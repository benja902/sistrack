from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


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
    production_date: date
    center_id: UUID
    responsible: str = Field(min_length=1, max_length=150)
    details: list[MilkProductionDetailCreate] = Field(min_length=1)

    @field_validator("responsible")
    @classmethod
    def strip_responsible(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("El responsable es obligatorio.")
        return value.strip()


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
    total_liters: Decimal
    registered_by_user_id: UUID
    created_at: datetime
    center: ProductionCenterRead
    product: ProductionProductRead


class MilkProductionDetailResponse(MilkProductionRead):
    details: list[MilkProductionDetailRead]
