from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str | None
    is_active: bool


class UserRead(BaseModel):
    """Public user representation; password_hash is intentionally excluded."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    role_id: UUID
    is_active: bool
    created_at: datetime


class OperationalActorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    document_number: str | None
    contact_phone: str | None
    is_active: bool
