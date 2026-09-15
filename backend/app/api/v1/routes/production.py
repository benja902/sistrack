from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.modules.identity.models import User
from app.modules.production.schemas import (
    MilkProductionCreate,
    MilkProductionDetailResponse,
    MilkProductionRead,
)
from app.modules.production.service import (
    ProductionValidationError,
    create_milk_production,
    get_milk_production,
    list_milk_productions,
)

router = APIRouter(prefix="/production/milk")
require_admin_user = require_roles("ADMINISTRADOR")


def get_temporary_registered_user_id(settings: Settings = Depends(get_settings)) -> UUID:
    """Temporary boundary to replace with the authenticated user dependency later."""
    return settings.temporary_registered_by_user_id


@router.get("", response_model=list[MilkProductionRead])
def list_productions(
    _current_user: Annotated[User, Depends(require_admin_user)],
    center_code: str | None = Query(default=None, max_length=50),
    session: Session = Depends(get_session),
) -> list[MilkProductionRead]:
    return list_milk_productions(session, center_code)  # type: ignore[return-value]


@router.get("/{production_id}", response_model=MilkProductionDetailResponse)
def get_production(
    production_id: UUID,
    _current_user: Annotated[User, Depends(require_admin_user)],
    session: Session = Depends(get_session),
) -> MilkProductionDetailResponse:
    production = get_milk_production(session, production_id)
    if production is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producción no encontrada.",
        )
    return production  # type: ignore[return-value]


@router.post("", response_model=MilkProductionDetailResponse, status_code=status.HTTP_201_CREATED)
def create_production(
    payload: MilkProductionCreate,
    session: Session = Depends(get_session),
    registered_by_user_id: UUID = Depends(get_temporary_registered_user_id),
) -> MilkProductionDetailResponse:
    try:
        return create_milk_production(session, payload, registered_by_user_id)  # type: ignore[return-value]
    except ProductionValidationError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
