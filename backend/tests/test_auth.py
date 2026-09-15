import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_roles
from app.core.config import Settings, get_settings
from app.core.security import create_access_token, hash_password
from app.db.session import get_session
from app.main import create_app
from app.modules.authentication.service import (
    ADMIN_NAME,
    authenticate_user,
    seed_admin_user,
)
from app.modules.identity.models import Role, User

TEST_SECRET = "test-only-secret-with-at-least-thirty-two-characters"
ADMIN_EMAIL = "abraham@example.test"
ADMIN_PASSWORD = "test-password-strong"


def auth_settings() -> Settings:
    return Settings(
        _env_file=None,
        JWT_SECRET=TEST_SECRET,
        JWT_ALGORITHM="HS256",
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30,
    )


def admin_user() -> User:
    role = Role(
        id=uuid.uuid4(),
        code="ADMINISTRADOR",
        name="Administrador / Supervisor",
        is_active=True,
    )
    return User(
        id=uuid.uuid4(),
        full_name=ADMIN_NAME,
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role_id=role.id,
        role=role,
        is_active=True,
    )


def test_login_correct_password_returns_bearer_token_and_session_user() -> None:
    user = admin_user()
    session = MagicMock(spec=Session)
    session.scalar.return_value = user
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_settings] = auth_settings

    response = TestClient(app).post(
        "/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]
    assert response.json()["user"]["name"] == "Abraham"
    assert response.json()["user"]["role"]["code"] == "ADMINISTRADOR"


def test_login_rejects_incorrect_password() -> None:
    session = MagicMock(spec=Session)
    session.scalar.return_value = admin_user()
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_settings] = auth_settings

    response = TestClient(app).post(
        "/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": "incorrect-password"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Correo o contraseña incorrectos."}


def test_login_rejects_unknown_user() -> None:
    session = MagicMock(spec=Session)
    session.scalar.return_value = None
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_settings] = auth_settings

    response = TestClient(app).post(
        "/api/v1/auth/login",
        json={"email": "unknown@example.test", "password": "incorrect-password"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Correo o contraseña incorrectos."}


def test_me_returns_authenticated_user_with_valid_token() -> None:
    user = admin_user()
    session = MagicMock(spec=Session)
    session.scalar.return_value = user
    settings = auth_settings()
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_settings] = lambda: settings
    token = create_access_token(user.id, settings)

    response = TestClient(app).get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)
    assert response.json()["name"] == "Abraham"
    assert response.json()["role"]["code"] == "ADMINISTRADOR"


def test_me_rejects_missing_or_invalid_token() -> None:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: MagicMock(spec=Session)
    app.dependency_overrides[get_settings] = auth_settings
    client = TestClient(app)

    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    ).status_code == 401


def test_admin_seed_is_idempotent_and_reuses_admin_role() -> None:
    role = Role(
        id=uuid.uuid4(),
        code="ADMINISTRADOR",
        name="Administrador / Supervisor",
        is_active=True,
    )
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [role, None, role]

    created_user = seed_admin_user(session, ADMIN_EMAIL, ADMIN_PASSWORD)
    session.scalar.side_effect = [role, created_user]
    existing_user = seed_admin_user(session, ADMIN_EMAIL, ADMIN_PASSWORD)

    assert existing_user is created_user
    assert created_user.full_name == "Abraham"
    assert created_user.role is role
    assert created_user.role_id == role.id
    assert session.add.call_count == 1
    assert session.commit.call_count == 2


def test_authenticate_user_validates_password_hash() -> None:
    user = admin_user()
    session = MagicMock(spec=Session)
    session.scalar.return_value = user

    assert authenticate_user(session, ADMIN_EMAIL, ADMIN_PASSWORD) is user
    assert authenticate_user(session, ADMIN_EMAIL, "incorrect-password") is None


def test_role_dependency_accepts_admin_and_rejects_other_roles() -> None:
    admin = admin_user()
    require_admin = require_roles("ADMINISTRADOR")

    assert require_admin(admin) is admin
    admin.role.code = "PRODUCCION"
    with pytest.raises(HTTPException) as error:
        require_admin(admin)
    assert error.value.status_code == 403


def test_administrative_production_queries_require_authentication() -> None:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: MagicMock(spec=Session)

    response = TestClient(app).get("/api/v1/production/milk")

    assert response.status_code == 401
