from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import DUMMY_PASSWORD_HASH, hash_password, verify_password
from app.modules.identity.models import Role, User

ADMIN_ROLE_CODE = "ADMINISTRADOR"
ADMIN_NAME = "Abraham"


class AdminSeedConfigurationError(RuntimeError):
    pass


def find_active_user_by_email(session: Session, email: str) -> User | None:
    return session.scalar(
        select(User)
        .options(selectinload(User.role))
        .where(func.lower(User.email) == email.lower(), User.is_active.is_(True))
    )


def authenticate_user(session: Session, email: str, password: str) -> User | None:
    user = find_active_user_by_email(session, email)
    encoded_password = user.password_hash if user and user.password_hash else DUMMY_PASSWORD_HASH
    password_is_valid = verify_password(password, encoded_password)
    if user is None or not user.password_hash or not password_is_valid:
        return None
    return user


def seed_admin_user(session: Session, email: str, password: str) -> User:
    normalized_email = email.strip().lower()
    if "@" not in normalized_email:
        raise AdminSeedConfigurationError("SEED_ADMIN_EMAIL no contiene un correo válido.")
    if len(password) < 12:
        raise AdminSeedConfigurationError(
            "SEED_ADMIN_PASSWORD debe contener al menos 12 caracteres."
        )

    admin_role = session.scalar(select(Role).where(Role.code == ADMIN_ROLE_CODE))
    if admin_role is None:
        raise AdminSeedConfigurationError("No existe el rol administrativo requerido.")

    user = session.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if user is None:
        user = User(
            full_name=ADMIN_NAME,
            email=normalized_email,
            password_hash=hash_password(password),
            role_id=admin_role.id,
            role=admin_role,
            is_active=True,
        )
        session.add(user)
    else:
        user.full_name = ADMIN_NAME
        user.role_id = admin_role.id
        user.role = admin_role
        user.is_active = True
        if not user.password_hash or not verify_password(password, user.password_hash):
            user.password_hash = hash_password(password)

    session.commit()
    session.refresh(user)
    return user
