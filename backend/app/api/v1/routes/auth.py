from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.config import Settings, get_settings
from app.core.security import SecurityConfigurationError, create_access_token
from app.db.session import get_session
from app.modules.authentication.schemas import LoginRequest, LoginResponse, SessionRole, SessionUser
from app.modules.authentication.service import authenticate_user
from app.modules.identity.models import User

router = APIRouter(prefix="/auth")


def to_session_user(user: User) -> SessionUser:
    return SessionUser(
        id=user.id,
        name=user.full_name,
        email=user.email,
        role=SessionRole(id=user.role.id, code=user.role.code, name=user.role.name),
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> LoginResponse:
    user = authenticate_user(session, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        token = create_access_token(user.id, settings)
    except SecurityConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La autenticación no está configurada correctamente.",
        ) from error
    return LoginResponse(access_token=token, user=to_session_user(user))


@router.get("/me", response_model=SessionUser)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> SessionUser:
    return to_session_user(current_user)
