from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

ContextType = Literal["dispatch", "production", "reception", "incident", "traceability"]


class ContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    context_type: ContextType
    context_id: UUID


class QueryRequest(ContextRequest):
    question: str = Field(min_length=1, max_length=1000)

    @field_validator("question", mode="before")
    @classmethod
    def strip_question(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class DifferenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dispatch_id: UUID


class AiResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    evidencia: list[str] = Field(max_length=100)
    advertencias: list[str] = Field(max_length=20)
    informacion_no_disponible: list[str] = Field(max_length=20)
    fallback_used: bool = False


class TraceabilityResponse(AiResponse):
    tipo: Literal["trazabilidad"] = "trazabilidad"
    resumen: str = Field(min_length=1, max_length=4000)
    estado_actual: str = Field(min_length=1, max_length=200)
    observaciones: list[str] = Field(max_length=50)


class DifferenceResponse(AiResponse):
    tipo: Literal["analisis_diferencia"] = "analisis_diferencia"
    interpretacion: str = Field(min_length=1, max_length=4000)
    diferencia: Decimal | None
    accion_sugerida: str = Field(min_length=1, max_length=1000)


class QueryResponse(AiResponse):
    tipo: Literal["consulta_contextual"] = "consulta_contextual"
    respuesta: str = Field(min_length=1, max_length=4000)
