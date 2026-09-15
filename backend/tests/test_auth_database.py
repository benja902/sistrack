import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.security import verify_password
from app.db.session import get_engine, get_session
from app.main import create_app
from app.modules.authentication.service import seed_admin_user
from app.modules.identity.models import User

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DATABASE_TESTS") != "1",
    reason="Las pruebas PostgreSQL se habilitan con RUN_DATABASE_TESTS=1.",
)

TEST_EMAIL = "abraham.integration@sitrack.test"
TEST_PASSWORD = "integration-password-only"
TEST_SECRET = "integration-only-secret-with-at-least-thirty-two-characters"


def test_real_database_admin_seed_login_and_me() -> None:
    engine = get_engine()
    assert engine is not None
    session = Session(engine)
    session.commit = session.flush  # type: ignore[method-assign]
    settings = Settings(_env_file=None, JWT_SECRET=TEST_SECRET)

    def override_session():
        yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_settings] = lambda: settings
    client = TestClient(app)

    try:
        first_seed = seed_admin_user(session, TEST_EMAIL, TEST_PASSWORD)
        second_seed = seed_admin_user(session, TEST_EMAIL, TEST_PASSWORD)

        assert first_seed.id == second_seed.id
        assert second_seed.full_name == "Abraham"
        assert second_seed.role.code == "ADMINISTRADOR"
        assert second_seed.password_hash != TEST_PASSWORD
        assert verify_password(TEST_PASSWORD, second_seed.password_hash or "")
        assert session.scalar(
            select(func.count(User.id)).where(func.lower(User.email) == TEST_EMAIL)
        ) == 1

        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        me_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["name"] == "Abraham"
        assert me_response.json()["role"]["code"] == "ADMINISTRADOR"
    finally:
        session.rollback()
        session.close()
        engine.dispose()
