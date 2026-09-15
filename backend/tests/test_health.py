from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint_is_available() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_reports_unavailable_without_database_configuration(monkeypatch) -> None:
    monkeypatch.setattr("app.api.v1.routes.health.database_is_ready", lambda: False)
    client = TestClient(create_app())

    response = client.get("/api/v1/health/ready")

    assert response.status_code == 503
