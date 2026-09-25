import os
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.session import get_engine, get_session
from app.main import create_app
from app.modules.catalog.models import Center
from app.modules.identity.models import OperationalActor
from app.modules.incidents.models import Incident
from app.modules.inventory.models import InventoryBalance, InventoryMovement
from app.modules.inventory.seed import find_inventory_seed_user
from app.modules.logistics.models import Dispatch
from app.modules.production.models import MilkProduction
from app.modules.production.schemas import MilkProductionCreate, MilkProductionDetailCreate
from app.modules.production.service import create_milk_production
from app.modules.requests.schemas import GuineaPigRequestCreate
from app.modules.requests.service import (
    authorize_request,
    confirm_request_availability,
    create_guinea_pig_request,
    register_request_payment,
)
from app.modules.traceability.models import TraceabilityEvent

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DATABASE_TESTS") != "1",
    reason="Las pruebas PostgreSQL se habilitan con RUN_DATABASE_TESTS=1.",
)


def test_real_database_logistics_flow() -> None:
    engine = get_engine()
    assert engine is not None
    assert {"dispatches", "receptions"}.issubset(inspect(engine).get_table_names())
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

        request = create_guinea_pig_request(
            session,
            GuineaPigRequestCreate(
                inventory_balance_id=balance.id,
                customer_name="Cliente logística",
                requested_quantity=1,
                requested_for=date.today() + timedelta(days=1),
            ),
            user.id,
        )
        confirm_request_availability(session, request.id, user.id)
        register_request_payment(session, request.id, "B001-LOG", user.id)
        request = authorize_request(session, request.id, user.id)
        assert balance.physical_quantity == physical_before
        assert balance.reserved_quantity == reserved_before + 1

        def override_session():
            yield session

        app.dependency_overrides[get_session] = override_session
        client = TestClient(app)
        client.headers["Authorization"] = f"Bearer {create_access_token(user.id, get_settings())}"

        created = client.post(
            "/api/v1/logistics/dispatches",
            json={
                "source_type": "GUINEA_PIG_REQUEST",
                "source_id": str(request.id),
                "destination": "Punto de venta",
                "delivery_mode": "DRIVER",
                "driver_name": "Conductor de prueba transaccional",
            },
        )
        assert created.status_code == 201
        dispatch_id = created.json()["id"]
        assert Decimal(created.json()["quantity"]) == Decimal("1")
        assert created.json()["status"] == "PENDING"
        assert created.json()["driver_actor"]["full_name"] == ("Conductor de prueba transaccional")
        assert balance.physical_quantity == physical_before

        departed = client.post(f"/api/v1/logistics/dispatches/{dispatch_id}/depart")
        assert departed.status_code == 200
        assert departed.json()["status"] == "IN_TRANSIT"
        assert balance.physical_quantity == physical_before - 1
        assert balance.reserved_quantity == reserved_before
        session.refresh(request)
        assert request.reservation is not None
        assert request.reservation.status == "RELEASED"
        movement = session.scalar(
            select(InventoryMovement).where(
                InventoryMovement.reference_type == "dispatch",
                InventoryMovement.reference_id == dispatch_id,
            )
        )
        assert movement is not None and movement.movement_type == "SALE"

        pending_reception = client.get(f"/api/v1/logistics/receptions/{dispatch_id}")
        assert pending_reception.status_code == 200
        assert pending_reception.json()["reception"] is None

        received = client.post(
            f"/api/v1/logistics/receptions/{dispatch_id}",
            json={
                "received_quantity": 1,
                "received_at": datetime.now(UTC).isoformat(),
            },
        )
        assert received.status_code == 200
        assert received.json()["reception"]["status"] == "CONFORMING"
        assert Decimal(received.json()["reception"]["difference"]) == Decimal("0")
        assert session.scalar(
            select(Incident).where(
                Incident.reception_id == received.json()["reception"]["id"]
            )
        ) is None

        milk = session.scalar(
            select(MilkProduction)
            .outerjoin(Dispatch, Dispatch.milk_production_id == MilkProduction.id)
            .where(Dispatch.id.is_(None), MilkProduction.total_liters > Decimal("0.5"))
            .order_by(MilkProduction.production_date.desc())
        )
        if milk is None:
            actor = session.scalar(
                select(OperationalActor)
                .where(OperationalActor.is_active.is_(True))
                .order_by(OperationalActor.created_at)
            )
            center = session.scalar(select(Center).where(Center.code == "KOTOSH"))
            assert actor is not None and center is not None
            milk = create_milk_production(
                session,
                MilkProductionCreate(
                    production_date=date.today(),
                    center_id=center.id,
                    responsible_actor_id=actor.id,
                    details=[
                        MilkProductionDetailCreate(
                            animal_reference="Vaca TEST logística 01",
                            liters=Decimal("8"),
                        ),
                        MilkProductionDetailCreate(
                            animal_reference="Vaca TEST logística 02",
                            liters=Decimal("7.5"),
                        ),
                    ],
                ),
                user.id,
            )
        milk_dispatch = client.post(
            "/api/v1/logistics/dispatches",
            json={
                "source_type": "MILK_PRODUCTION",
                "source_id": str(milk.id),
                "destination": "Punto de venta",
                "delivery_mode": "DRIVER",
                "driver_name": "Conductor de prueba transaccional",
            },
        )
        assert milk_dispatch.status_code == 201
        milk_dispatch_id = milk_dispatch.json()["id"]
        assert (
            client.post(f"/api/v1/logistics/dispatches/{milk_dispatch_id}/depart").status_code
            == 200
        )
        milk_received = client.post(
            f"/api/v1/logistics/receptions/{milk_dispatch_id}",
            json={
                "received_quantity": float(milk.total_liters - Decimal("0.5")),
                "received_at": datetime.now(UTC).isoformat(),
                "observation": "Diferencia informada en recepción.",
            },
        )
        assert milk_received.status_code == 200
        assert milk_received.json()["reception"]["status"] == "WITH_DIFFERENCE"
        assert Decimal(milk_received.json()["reception"]["difference"]) == Decimal("-0.5")

        incident = session.scalar(
            select(Incident).where(
                Incident.reception_id == milk_received.json()["reception"]["id"]
            )
        )
        assert incident is not None
        assert incident.status == "OPEN"
        original_difference = Decimal(milk_received.json()["reception"]["difference"])

        incidents = client.get("/api/v1/incidents")
        assert incidents.status_code == 200
        assert any(item["id"] == str(incident.id) for item in incidents.json())
        detail = client.get(f"/api/v1/incidents/{incident.id}")
        assert detail.status_code == 200
        assert Decimal(detail.json()["reception"]["difference"]) == original_difference

        closed = client.post(
            f"/api/v1/incidents/{incident.id}/close",
            json={"resolution": "Diferencia revisada y documentada por Abraham."},
        )
        assert closed.status_code == 200
        assert closed.json()["status"] == "CLOSED"
        assert closed.json()["closed_by_user"]["id"] == str(user.id)
        assert Decimal(closed.json()["reception"]["difference"]) == original_difference

        event_types = set(
            session.scalars(
                select(TraceabilityEvent.event_type).where(
                    TraceabilityEvent.event_type.in_(
                        (
                            "dispatch_created",
                            "dispatch_departed",
                            "reception_registered",
                            "reception_difference_detected",
                            "incident_created",
                            "incident_closed",
                        )
                    )
                )
            ).all()
        )
        assert event_types == {
            "dispatch_created",
            "dispatch_departed",
            "reception_registered",
            "reception_difference_detected",
            "incident_created",
            "incident_closed",
        }
    finally:
        session.rollback()
        session.close()
        engine.dispose()
