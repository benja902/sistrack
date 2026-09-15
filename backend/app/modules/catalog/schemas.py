from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    is_active: bool


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    name: str
    unit_of_measure: str
    is_active: bool
