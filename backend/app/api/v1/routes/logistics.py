from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.db.session import get_session
from app.modules.identity.models import User
from app.modules.logistics.schemas import DispatchCreate, DispatchRead, ReceptionCreate
from app.modules.logistics.service import (
    LogisticsValidationError,
    confirm_dispatch_departure,
    create_dispatch,
    get_dispatch,
    list_dispatches,
    list_receptions,
    register_reception,
)

router = APIRouter(prefix="/logistics")
require_admin_user = require_roles("ADMINISTRADOR")


def _unprocessable(error: LogisticsValidationError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error))


@router.get("/dispatches", response_model=list[DispatchRead])
def get_dispatches(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    session: Session = Depends(get_session),
) -> list[DispatchRead]:
    return list_dispatches(session, center_code)  # type: ignore[return-value]


@router.post("/dispatches", response_model=DispatchRead, status_code=status.HTTP_201_CREATED)
def post_dispatch(
    payload: DispatchCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> DispatchRead:
    try:
        return create_dispatch(session, payload, current_user.id)  # type: ignore[return-value]
    except LogisticsValidationError as error:
        session.rollback()
        raise _unprocessable(error) from error


@router.get("/dispatches/{dispatch_id}", response_model=DispatchRead)
def get_dispatch_detail(
    dispatch_id: UUID,
    _current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> DispatchRead:
    dispatch = get_dispatch(session, dispatch_id)
    if dispatch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despacho no encontrado.")
    return dispatch  # type: ignore[return-value]


@router.post("/dispatches/{dispatch_id}/depart", response_model=DispatchRead)
def depart_dispatch(
    dispatch_id: UUID,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> DispatchRead:
    try:
        return confirm_dispatch_departure(session, dispatch_id, current_user.id)  # type: ignore[return-value]
    except LogisticsValidationError as error:
        session.rollback()
        raise _unprocessable(error) from error


@router.get("/receptions", response_model=list[DispatchRead])
def get_receptions(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    session: Session = Depends(get_session),
) -> list[DispatchRead]:
    return list_receptions(session, center_code)  # type: ignore[return-value]


@router.get("/receptions/{dispatch_id}", response_model=DispatchRead)
def get_reception_detail(
    dispatch_id: UUID,
    _current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> DispatchRead:
    dispatch = get_dispatch(session, dispatch_id)
    if dispatch is None or dispatch.delivery_mode != "DRIVER" or dispatch.status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recepción no encontrada."
        )
    return dispatch  # type: ignore[return-value]


@router.post("/receptions/{dispatch_id}", response_model=DispatchRead)
def post_reception(
    dispatch_id: UUID,
    payload: ReceptionCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> DispatchRead:
    try:
        return register_reception(session, dispatch_id, payload, current_user.id)  # type: ignore[return-value]
    except LogisticsValidationError as error:
        session.rollback()
        raise _unprocessable(error) from error
