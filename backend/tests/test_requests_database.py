import os
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.session import get_engine, get_session
from app.main import create_app
from app.modules.inventory.models import InventoryBalance
from app.modules.inventory.seed import find_inventory_seed_user
from app.modules.requests.models import GuineaPigRequest
from app.modules.traceability.models import TraceabilityEvent

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DATABASE_TESTS") != "1",
    reason="Las pruebas PostgreSQL se habilitan con RUN_DATABASE_TESTS=1.",
)


def test_real_database_guinea_pig_request_flow() -> None:
    engine = get_engine()
    assert engine is not None
    database_inspector = inspect(engine)
    assert {"guinea_pig_requests", "inventory_reservations"}.issubset(
        database_inspector.get_table_names()
    )

    session = Session(engine)
    session.commit = session.flush  # type: ignore[method-assign]
    app = create_app()

    try:
        user = find_inventory_seed_user(session, None)
        assert user is not None
        balance = session.scalar(
            select(InventoryBalance)
            .options(selectinload(InventoryBalance.center))
            .where(InventoryBalance.physical_quantity > InventoryBalance.reserved_quantity)
            .order_by(InventoryBalance.id)
        )
        assert balance is not None
        physical_before = balance.physical_quantity
        reserved_before = balance.reserved_quantity

        def override_session():
            yield session

        app.dependency_overrides[get_session] = override_session
        client = TestClient(app)
        client.headers["Authorization"] = f"Bearer {create_access_token(user.id, get_settings())}"

        created_response = client.post(
            "/api/v1/requests/guinea-pigs",
            json={
                "inventory_balance_id": str(balance.id),
                "customer_name": "Cliente de integración",
                "requested_quantity": 1,
                "requested_for": (date.today() + timedelta(days=2)).isoformat(),
            },
        )
        assert created_response.status_code == 201
        created = created_response.json()
        request_id = created["id"]
        assert created["status"] == "REQUESTED"
        assert balance.physical_quantity == physical_before
        assert balance.reserved_quantity == reserved_before

        confirmed_response = client.post(
            f"/api/v1/requests/guinea-pigs/{request_id}/confirm-availability"
        )
        assert confirmed_response.status_code == 200
        assert confirmed_response.json()["reservation"]["status"] == "ACTIVE"
        assert balance.physical_quantity == physical_before
        assert balance.reserved_quantity == reserved_before + 1

        paid_response = client.post(
            f"/api/v1/requests/guinea-pigs/{request_id}/register-payment",
            json={"receipt_reference": "B001-INTEGRATION"},
        )
        assert paid_response.status_code == 200
        assert paid_response.json()["status"] == "PAID"
        assert balance.physical_quantity == physical_before

        authorized_response = client.post(f"/api/v1/requests/guinea-pigs/{request_id}/authorize")
        assert authorized_response.status_code == 200
        assert authorized_response.json()["status"] == "AUTHORIZED"
        assert balance.physical_quantity == physical_before

        list_response = client.get(
            f"/api/v1/requests/guinea-pigs?center_code={balance.center.code}"
        )
        assert list_response.status_code == 200
        assert request_id in {item["id"] for item in list_response.json()}

        detail_response = client.get(f"/api/v1/requests/guinea-pigs/{request_id}")
        assert detail_response.status_code == 200
        assert detail_response.json()["request_code"] == created["request_code"]

        request = session.get(GuineaPigRequest, request_id)
        assert request is not None
        events = session.scalars(
            select(TraceabilityEvent).where(
                TraceabilityEvent.reference_type == "guinea_pig_request",
                TraceabilityEvent.reference_id == request.id,
            )
        ).all()
        assert {event.event_type for event in events} == {
            "request_created",
            "request_availability_confirmed",
            "request_payment_registered",
            "request_authorized",
        }
    finally:
        session.rollback()
        session.close()
        engine.dispose()
