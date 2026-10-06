from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.db.session import get_session
from app.modules.identity.models import User
from app.modules.traceability.schemas import TraceabilityEventRead
from app.modules.traceability.service import list_traceability_events

router = APIRouter(prefix="/traceability")
require_admin_user = require_roles("ADMINISTRADOR")


@router.get("", response_model=list[TraceabilityEventRead])
def get_traceability_events(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    search: str | None = Query(default=None, max_length=100),
    session: Session = Depends(get_session),
) -> list[TraceabilityEventRead]:
    return list_traceability_events(session, center_code, search)  # type: ignore[return-value]
