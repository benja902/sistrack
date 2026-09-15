import os
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.session import get_engine, get_session
from app.main import create_app
from app.modules.inventory.models import InventoryBalance
from app.modules.inventory.seed import find_inventory_seed_user, seed_inventory
from app.modules.traceability.models import TraceabilityEvent

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DATABASE_TESTS") != "1",
    reason="Las pruebas PostgreSQL se habilitan con RUN_DATABASE_TESTS=1.",
)


def test_real_database_inventory_flow() -> None:
    engine = get_engine()
    assert engine is not None
    database_inspector = inspect(engine)
    assert {"inventory_balances", "inventory_movements"}.issubset(
        database_inspector.get_table_names()
    )
    assert "centers" in {
        foreign_key["referred_table"]
        for foreign_key in database_inspector.get_foreign_keys("inventory_balances")
    }
    assert {"centers", "users", "inventory_balances"}.issubset(
        {
            foreign_key["referred_table"]
            for foreign_key in database_inspector.get_foreign_keys("inventory_movements")
        }
    )

    session = Session(engine)
    session.commit = session.flush  # type: ignore[method-assign]
    app = create_app()

    try:
        user = find_inventory_seed_user(session, None)
        assert user is not None
        seed_inventory(session, user)

        def override_session():
            yield session

        app.dependency_overrides[get_session] = override_session
        client = TestClient(app)
        client.headers["Authorization"] = (
            f"Bearer {create_access_token(user.id, get_settings())}"
        )

        list_response = client.get("/api/v1/inventory/existences?center_code=KOTOSH")
        assert list_response.status_code == 200
        balances = list_response.json()
        assert len(balances) == 7
        assert all(
            item["available_quantity"]
            == item["physical_quantity"] - item["reserved_quantity"]
            for item in balances
        )

        canchan_response = client.get("/api/v1/inventory/existences?center_code=CANCHAN")
        assert canchan_response.status_code == 200
        assert len(canchan_response.json()) == 7

        balance = session.scalar(
            select(InventoryBalance)
            .options(selectinload(InventoryBalance.center))
            .where(
                InventoryBalance.center.has(code="CANCHAN"),
                InventoryBalance.category == "Adultos / reproductores H",
            )
        )
        assert balance is not None
        physical_before = balance.physical_quantity

        existence_detail = client.get(f"/api/v1/inventory/existences/{balance.id}")
        assert existence_detail.status_code == 200
        assert existence_detail.json()["id"] == str(balance.id)
        assert "movements" in existence_detail.json()

        movements_response = client.get("/api/v1/inventory/movements?center_code=KOTOSH")
        assert movements_response.status_code == 200
        assert {item["movement_type"] for item in movements_response.json()} == {
            "SALE",
            "MORTALITY",
        }

        response = client.post(
            "/api/v1/inventory/movements",
            json={
                "center_id": str(balance.center_id),
                "category": balance.category,
                "movement_type": "MORTALITY",
                "quantity": -1,
                "description": "Movimiento de integración.",
                "occurred_at": datetime.now(UTC).isoformat(),
            },
        )
        assert response.status_code == 201
        created = response.json()
        assert created["physical_quantity_before"] == physical_before
        assert created["physical_quantity_after"] == physical_before - 1
        assert created["registered_by_user_id"] == str(user.id)
        assert balance.physical_quantity == physical_before - 1

        movement_id = created["id"]
        detail_response = client.get(f"/api/v1/inventory/movements/{movement_id}")
        assert detail_response.status_code == 200
        assert detail_response.json()["id"] == movement_id

        event = session.scalar(
            select(TraceabilityEvent).where(
                TraceabilityEvent.reference_type == "inventory_movement",
                TraceabilityEvent.reference_id == movement_id,
            )
        )
        assert event is not None
        assert event.event_type == "inventory_movement_registered"
        assert event.recorded_by_user_id == user.id

        invalid_quantity = client.post(
            "/api/v1/inventory/movements",
            json={
                "center_id": str(balance.center_id),
                "category": balance.category,
                "movement_type": "SALE",
                "quantity": 1,
                "description": "Cantidad inválida.",
                "occurred_at": datetime.now(UTC).isoformat(),
            },
        )
        assert invalid_quantity.status_code == 422

        excessive_quantity = client.post(
            "/api/v1/inventory/movements",
            json={
                "center_id": str(balance.center_id),
                "category": balance.category,
                "movement_type": "SALE",
                "quantity": -10000,
                "description": "Cantidad excesiva.",
                "occurred_at": datetime.now(UTC).isoformat(),
            },
        )
        assert excessive_quantity.status_code == 422
    finally:
        session.rollback()
        session.close()
        engine.dispose()
