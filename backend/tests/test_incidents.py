from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.main import create_app
from app.modules.incidents.schemas import IncidentClose


def test_incident_close_requires_a_resolution() -> None:
    with pytest.raises(ValidationError):
        IncidentClose(resolution=" ")


def test_incidents_api_exposes_only_mvp_routes_and_requires_authentication() -> None:
    app = create_app()
    paths = app.openapi()["paths"]

    assert set(paths["/api/v1/incidents"]) == {"get"}
    assert set(paths["/api/v1/incidents/{incident_id}"]) == {"get"}
    assert set(paths["/api/v1/incidents/{incident_id}/close"]) == {"post"}

    def override_session():
        yield MagicMock(spec=Session)

    app.dependency_overrides[get_session] = override_session
    assert TestClient(app).get("/api/v1/incidents").status_code == 401
