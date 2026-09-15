from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings, get_settings
from app.core.security import SecurityConfigurationError, decode_access_token
from app.db.session import get_session
from app.modules.identity.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def authentication_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la sesión.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise authentication_error()

    try:
        user_id = decode_access_token(credentials.credentials, settings)
    except InvalidTokenError as error:
        raise authentication_error() from error
    except SecurityConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La autenticación no está configurada correctamente.",
        ) from error

    user = session.scalar(
        select(User)
        .options(selectinload(User.role))
        .where(User.id == user_id, User.is_active.is_(True))
    )
    if user is None:
        raise authentication_error()
    return user


def require_roles(*role_codes: str) -> Callable[..., User]:
    allowed_roles = set(role_codes)

    def role_dependency(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role.code not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No cuenta con permisos para realizar esta acción.",
            )
        return current_user

    return role_dependency
