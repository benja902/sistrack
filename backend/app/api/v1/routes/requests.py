from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.db.session import get_session
from app.modules.identity.models import User
from app.modules.requests.schemas import (
    GuineaPigRequestCreate,
    GuineaPigRequestRead,
    PaymentRegistration,
)
from app.modules.requests.service import (
    RequestValidationError,
    authorize_request,
    confirm_request_availability,
    create_guinea_pig_request,
    get_guinea_pig_request,
    list_guinea_pig_requests,
    register_request_payment,
)

router = APIRouter(prefix="/requests/guinea-pigs")
require_admin_user = require_roles("ADMINISTRADOR")


def _unprocessable(error: RequestValidationError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error))


@router.get("", response_model=list[GuineaPigRequestRead])
def list_requests(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    request_status: Literal["REQUESTED", "AVAILABILITY_CONFIRMED", "PAID", "AUTHORIZED"]
    | None = None,
    session: Session = Depends(get_session),
) -> list[GuineaPigRequestRead]:
    return list_guinea_pig_requests(session, center_code, request_status)  # type: ignore[return-value]


@router.get("/{request_id}", response_model=GuineaPigRequestRead)
def get_request(
    request_id: UUID,
    _current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> GuineaPigRequestRead:
    request = get_guinea_pig_request(session, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada.",
        )
    return request  # type: ignore[return-value]


@router.post("", response_model=GuineaPigRequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: GuineaPigRequestCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> GuineaPigRequestRead:
    try:
        return create_guinea_pig_request(session, payload, current_user.id)  # type: ignore[return-value]
    except RequestValidationError as error:
        session.rollback()
        raise _unprocessable(error) from error


@router.post("/{request_id}/confirm-availability", response_model=GuineaPigRequestRead)
def confirm_availability(
    request_id: UUID,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> GuineaPigRequestRead:
    try:
        return confirm_request_availability(session, request_id, current_user.id)  # type: ignore[return-value]
    except RequestValidationError as error:
        session.rollback()
        raise _unprocessable(error) from error


@router.post("/{request_id}/register-payment", response_model=GuineaPigRequestRead)
def register_payment(
    request_id: UUID,
    payload: PaymentRegistration,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> GuineaPigRequestRead:
    try:
        return register_request_payment(
            session, request_id, payload.receipt_reference, current_user.id
        )  # type: ignore[return-value]
    except RequestValidationError as error:
        session.rollback()
        raise _unprocessable(error) from error


@router.post("/{request_id}/authorize", response_model=GuineaPigRequestRead)
def authorize(
    request_id: UUID,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> GuineaPigRequestRead:
    try:
        return authorize_request(session, request_id, current_user.id)  # type: ignore[return-value]
    except RequestValidationError as error:
        session.rollback()
        raise _unprocessable(error) from error
