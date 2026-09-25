from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class IncidentClose(BaseModel):
    model_config = ConfigDict(extra="forbid")

    resolution: str = Field(min_length=2, max_length=1000)

    @field_validator("resolution")
    @classmethod
    def strip_resolution(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 2:
            raise ValueError("El resultado del cierre es obligatorio.")
        return stripped


class IncidentUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str


class IncidentCenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str
    name: str


class IncidentProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sku: str
    name: str
    unit_of_measure: str


class IncidentDispatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    dispatch_code: str
    source_code: str
    center: IncidentCenterRead
    product: IncidentProductRead
    destination: str


class IncidentReceptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    dispatch: IncidentDispatchRead
    dispatched_quantity: Decimal
    received_quantity: Decimal
    difference: Decimal
    observation: str | None
    received_at: datetime


class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    incident_code: str
    reception: IncidentReceptionRead
    status: Literal["OPEN", "CLOSED"]
    resolution: str | None
    created_at: datetime
    closed_at: datetime | None
    closed_by_user: IncidentUserRead | None
