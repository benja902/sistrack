from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=1024)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized:
            raise ValueError("El correo no es válido.")
        return normalized


class SessionRole(BaseModel):
    id: UUID
    code: str
    name: str


class SessionUser(BaseModel):
    id: UUID
    name: str
    email: str
    role: SessionRole


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: SessionUser
