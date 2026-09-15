from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.db.session import get_session
from app.modules.identity.models import User
from app.modules.inventory.schemas import (
    InventoryBalanceDetailResponse,
    InventoryBalanceRead,
    InventoryMovementCreate,
    InventoryMovementRead,
)
from app.modules.inventory.service import (
    InventoryValidationError,
    create_inventory_movement,
    get_inventory_balance_detail,
    get_inventory_movement,
    list_inventory_balances,
    list_inventory_movements,
)

router = APIRouter(prefix="/inventory")
require_admin_user = require_roles("ADMINISTRADOR")


@router.get("/existences", response_model=list[InventoryBalanceRead])
def list_existences(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    session: Session = Depends(get_session),
) -> list[InventoryBalanceRead]:
    return list_inventory_balances(session, center_code)  # type: ignore[return-value]


@router.get("/existences/{balance_id}", response_model=InventoryBalanceDetailResponse)
def get_existence(
    balance_id: UUID,
    _current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> InventoryBalanceDetailResponse:
    balance = get_inventory_balance_detail(session, balance_id)
    if balance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Existencia no encontrada.",
        )
    return balance


@router.get("/movements", response_model=list[InventoryMovementRead])
def list_movements(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    session: Session = Depends(get_session),
) -> list[InventoryMovementRead]:
    return list_inventory_movements(session, center_code)  # type: ignore[return-value]


@router.get("/movements/{movement_id}", response_model=InventoryMovementRead)
def get_movement(
    movement_id: UUID,
    _current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> InventoryMovementRead:
    movement = get_inventory_movement(session, movement_id)
    if movement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movimiento no encontrado.",
        )
    return movement  # type: ignore[return-value]


@router.post(
    "/movements",
    response_model=InventoryMovementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_movement(
    payload: InventoryMovementCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> InventoryMovementRead:
    try:
        return create_inventory_movement(session, payload, current_user.id)  # type: ignore[return-value]
    except InventoryValidationError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
