from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TraceabilityUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str


class TraceabilityActorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str


class TraceabilityCenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str


class TraceabilityProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    name: str
    unit_of_measure: str


class TraceabilityEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    event_type: str
    occurred_at: datetime
    recorded_at: datetime
    recorded_by_user_id: UUID
    operational_actor_id: UUID | None
    center_id: UUID
    product_id: UUID | None
    reference_type: str | None
    reference_id: UUID | None
    description: str
    event_metadata: dict[str, Any] | None
    recorded_by_user: TraceabilityUserRead
    operational_actor: TraceabilityActorRead | None
    center: TraceabilityCenterRead
    product: TraceabilityProductRead | None
