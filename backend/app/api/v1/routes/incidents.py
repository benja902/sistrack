from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.db.session import get_session
from app.modules.identity.models import User
from app.modules.incidents.schemas import IncidentClose, IncidentRead
from app.modules.incidents.service import (
    IncidentValidationError,
    close_incident,
    get_incident,
    list_incidents,
)

router = APIRouter(prefix="/incidents")
require_admin_user = require_roles("ADMINISTRADOR")


@router.get("", response_model=list[IncidentRead])
def get_incidents(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    session: Session = Depends(get_session),
) -> list[IncidentRead]:
    return list_incidents(session, center_code)  # type: ignore[return-value]


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident_detail(
    incident_id: UUID,
    _current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> IncidentRead:
    incident = get_incident(session, incident_id)
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidencia no encontrada.",
        )
    return incident  # type: ignore[return-value]


@router.post("/{incident_id}/close", response_model=IncidentRead)
def post_incident_close(
    incident_id: UUID,
    payload: IncidentClose,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> IncidentRead:
    try:
        return close_incident(
            session,
            incident_id,
            payload.resolution,
            current_user.id,
        )  # type: ignore[return-value]
    except IncidentValidationError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
