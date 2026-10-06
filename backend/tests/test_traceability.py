from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.main import create_app


def test_traceability_api_exposes_read_only_route_and_requires_authentication() -> None:
    app = create_app()
    assert set(app.openapi()["paths"]["/api/v1/traceability"]) == {"get"}

    def override_session():
        yield MagicMock(spec=Session)

    app.dependency_overrides[get_session] = override_session
    assert TestClient(app).get("/api/v1/traceability").status_code == 401
