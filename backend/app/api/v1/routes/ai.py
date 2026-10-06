from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.db.session import get_session
from app.modules.ai.client import GeminiClient
from app.modules.ai.context import build_context
from app.modules.ai.schemas import (
    ContextRequest,
    DifferenceRequest,
    DifferenceResponse,
    QueryRequest,
    QueryResponse,
    TraceabilityResponse,
)
from app.modules.ai.service import execute_ai
from app.modules.identity.models import User

router = APIRouter(prefix="/ai")
Admin = Annotated[User, Depends(require_roles("ADMINISTRADOR"))]
Database = Annotated[Session, Depends(get_session)]


def prepare_traceability(body: ContextRequest, user: Admin, session: Database):
    return body, user.id, build_context(session, body.context_type, body.context_id)


def prepare_query(body: QueryRequest, user: Admin, session: Database):
    return body, user.id, build_context(session, body.context_type, body.context_id)


def prepare_difference(body: DifferenceRequest, user: Admin, session: Database):
    return body, user.id, build_context(session, "dispatch", body.dispatch_id)


def get_client(request: Request) -> GeminiClient:
    return request.app.state.gemini_client


@router.post("/traceability/explain", response_model=TraceabilityResponse)
async def explain_traceability(
    prepared: Annotated[tuple, Depends(prepare_traceability)],
    client: Annotated[GeminiClient, Depends(get_client)],
):
    body, user_id, context = prepared
    return await execute_ai(
        client,
        context,
        TraceabilityResponse,
        user_id,
        body.context_type,
        body.context_id,
        "RF-IA-01",
    )


@router.post("/differences/analyze", response_model=DifferenceResponse)
async def analyze_difference(
    prepared: Annotated[tuple, Depends(prepare_difference)],
    client: Annotated[GeminiClient, Depends(get_client)],
):
    body, user_id, context = prepared
    return await execute_ai(
        client, context, DifferenceResponse, user_id, "dispatch", body.dispatch_id, "RF-IA-02"
    )


@router.post("/context/query", response_model=QueryResponse)
async def query_context(
    prepared: Annotated[tuple, Depends(prepare_query)],
    client: Annotated[GeminiClient, Depends(get_client)],
):
    body, user_id, context = prepared
    return await execute_ai(
        client,
        context,
        QueryResponse,
        user_id,
        body.context_type,
        body.context_id,
        "RF-IA-03",
        body.question,
    )
