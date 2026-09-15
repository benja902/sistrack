import os
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine, get_session
from app.main import create_app
from app.modules.identity.models import OperationalActor
from app.modules.traceability.models import TraceabilityEvent

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DATABASE_TESTS") != "1",
    reason="Las pruebas PostgreSQL se habilitan con RUN_DATABASE_TESTS=1.",
)


def test_real_database_milk_production_flow() -> None:
    engine = get_engine()
    assert engine is not None

    database_inspector = inspect(engine)
    assert "milk_productions" in database_inspector.get_table_names()
    assert "milk_production_details" in database_inspector.get_table_names()
    production_references = {
        foreign_key["referred_table"]
        for foreign_key in database_inspector.get_foreign_keys("milk_productions")
    }
    detail_references = {
        foreign_key["referred_table"]
        for foreign_key in database_inspector.get_foreign_keys("milk_production_details")
    }
    assert {"centers", "products", "users"}.issubset(production_references)
    assert "operational_actors" in production_references
    assert "milk_productions" in detail_references

    session = Session(engine)
    session.commit = session.flush  # type: ignore[method-assign]

    def override_session():
        yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    client = TestClient(app)

    try:
        responsible_actor = session.scalar(
            select(OperationalActor).where(OperationalActor.full_name == "Vilma")
        )
        assert responsible_actor is not None
        production_date = date.today() - timedelta(days=1)
        request_started_at = datetime.now(UTC)
        response = client.post(
            "/api/v1/production/milk",
            json={
                "production_date": production_date.isoformat(),
                "center_id": "00000000-0000-0000-0000-000000000101",
                "responsible_actor_id": str(responsible_actor.id),
                "details": [
                    {"animal_reference": "Vaca 01", "liters": 7.5},
                    {"animal_reference": "Vaca 02", "liters": 8.0},
                    {"animal_reference": "Vaca 03", "liters": 6.5},
                ],
            },
        )
        request_finished_at = datetime.now(UTC)
        assert response.status_code == 201
        created = response.json()
        assert Decimal(created["total_liters"]) == Decimal("22.000")
        assert created["lot_code"].startswith(f"LEC-KOT-{production_date:%Y%m%d}-")
        assert len(created["details"]) == 3
        assert created["responsible_actor"]["id"] == str(responsible_actor.id)
        assert created["registered_by"]["id"] == str(
            get_settings().temporary_registered_by_user_id
        )
        assert created["responsible_actor"]["id"] != created["registered_by"]["id"]

        production_id = created["id"]
        event = session.scalar(
            select(TraceabilityEvent).where(
                TraceabilityEvent.reference_type == "milk_production",
                TraceabilityEvent.reference_id == production_id,
            )
        )
        assert event is not None
        assert event.event_type == "production_registered"
        assert request_started_at <= event.occurred_at <= request_finished_at
        assert Decimal(str(event.event_metadata["quantity"])) == Decimal("22.0")
        assert event.recorded_by_user_id == get_settings().temporary_registered_by_user_id
        assert event.operational_actor_id == responsible_actor.id

        detail_response = client.get(f"/api/v1/production/milk/{production_id}")
        assert detail_response.status_code == 200
        assert len(detail_response.json()["details"]) == 3

        list_response = client.get("/api/v1/production/milk?center_code=KOTOSH")
        assert list_response.status_code == 200
        assert any(item["id"] == production_id for item in list_response.json())

        canchan_response = client.get("/api/v1/production/milk?center_code=CANCHAN")
        assert canchan_response.status_code == 200
        assert canchan_response.json() == []

        canchan_create_response = client.post(
            "/api/v1/production/milk",
            json={
                "production_date": date.today().isoformat(),
                "center_id": "00000000-0000-0000-0000-000000000102",
                "responsible_actor_id": str(responsible_actor.id),
                "details": [{"animal_reference": "Vaca 10", "liters": 5}],
            },
        )
        assert canchan_create_response.status_code == 422

        future_date_response = client.post(
            "/api/v1/production/milk",
            json={
                "production_date": (date.today() + timedelta(days=1)).isoformat(),
                "center_id": "00000000-0000-0000-0000-000000000101",
                "responsible_actor_id": str(responsible_actor.id),
                "details": [{"animal_reference": "Vaca 11", "liters": 5}],
            },
        )
        assert future_date_response.status_code == 422

        duplicate_reference_response = client.post(
            "/api/v1/production/milk",
            json={
                "production_date": date.today().isoformat(),
                "center_id": "00000000-0000-0000-0000-000000000101",
                "responsible_actor_id": str(responsible_actor.id),
                "details": [
                    {"animal_reference": "Vaca 12", "liters": 5},
                    {"animal_reference": "vaca 12", "liters": 4},
                ],
            },
        )
        assert duplicate_reference_response.status_code == 422

        another_production_response = client.post(
            "/api/v1/production/milk",
            json={
                "production_date": production_date.isoformat(),
                "center_id": "00000000-0000-0000-0000-000000000101",
                "responsible_actor_id": str(responsible_actor.id),
                "details": [{"animal_reference": "Vaca 01", "liters": 3}],
            },
        )
        assert another_production_response.status_code == 201
    finally:
        session.rollback()
        session.close()
        engine.dispose()
