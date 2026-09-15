import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.main import create_app
from app.modules.catalog.models import Center, Product
from app.modules.identity.models import User
from app.modules.inventory.models import InventoryBalance, InventoryMovement
from app.modules.inventory.schemas import InventoryBalanceRead, InventoryMovementCreate
from app.modules.inventory.service import (
    INVENTORY_EVENT_TYPE,
    INVENTORY_REFERENCE_TYPE,
    InventoryValidationError,
    create_inventory_movement,
)
from app.modules.traceability.models import TraceabilityEvent

CENTER_ID = uuid.UUID("00000000-0000-0000-0000-000000000101")
USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000501")
PRODUCT_ID = uuid.UUID("00000000-0000-0000-0000-000000000202")


def valid_payload(quantity: int = -6) -> InventoryMovementCreate:
    return InventoryMovementCreate(
        center_id=CENTER_ID,
        category="Juvenil H",
        movement_type="SALE",
        quantity=quantity,
        description="Salida física por venta.",
        occurred_at=datetime.now(UTC),
    )


def inventory_dependencies(physical: int = 136, reserved: int = 30):
    center = Center(id=CENTER_ID, code="KOTOSH", name="Kotosh", is_active=True)
    user = User(
        id=USER_ID,
        full_name="Abraham",
        email="abraham@example.test",
        role_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        is_active=True,
    )
    product = Product(
        id=PRODUCT_ID,
        sku="CUYES",
        name="Cuyes",
        unit_of_measure="ejemplares",
        is_active=True,
    )
    balance = InventoryBalance(
        id=uuid.uuid4(),
        center_id=CENTER_ID,
        category="Juvenil H",
        physical_quantity=physical,
        reserved_quantity=reserved,
        center=center,
    )
    return user, balance, product


def test_available_quantity_is_calculated_and_not_a_database_column() -> None:
    user, balance, _product = inventory_dependencies()
    balance.id = uuid.uuid4()
    balance.created_at = datetime.now(UTC)
    balance.updated_at = datetime.now(UTC)

    response = InventoryBalanceRead.model_validate(balance)

    assert "available_quantity" not in InventoryBalance.__table__.c
    assert response.available_quantity == 106
    assert user.full_name == "Abraham"


def test_movement_schema_rejects_non_negative_quantity_and_incomplete_reference() -> None:
    with pytest.raises(ValidationError):
        valid_payload(quantity=1)
    with pytest.raises(ValidationError):
        InventoryMovementCreate(
            **valid_payload().model_dump(exclude={"reference_type", "reference_id"}),
            reference_type="request",
        )


def test_service_updates_stock_and_creates_append_only_traceability_event() -> None:
    user, balance, product = inventory_dependencies()
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [user, balance, product]

    movement = create_inventory_movement(session, valid_payload(), USER_ID)

    assert balance.physical_quantity == 130
    assert movement.quantity == -6
    assert movement.balance_id == balance.id
    assert movement.physical_quantity_before == 136
    assert movement.physical_quantity_after == 130
    assert movement.registered_by_user_id == USER_ID
    events = [
        call.args[0]
        for call in session.add.call_args_list
        if isinstance(call.args[0], TraceabilityEvent)
    ]
    assert len(events) == 1
    assert events[0].event_type == INVENTORY_EVENT_TYPE
    assert events[0].reference_type == INVENTORY_REFERENCE_TYPE
    assert events[0].reference_id == movement.id
    assert events[0].event_metadata["quantity"] == -6
    session.commit.assert_called_once()


def test_service_rejects_reduction_that_would_consume_reserved_stock() -> None:
    user, balance, product = inventory_dependencies(physical=100, reserved=30)
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [user, balance, product]

    with pytest.raises(InventoryValidationError, match="excede"):
        create_inventory_movement(session, valid_payload(quantity=-71), USER_ID)

    assert balance.physical_quantity == 100


def test_service_rejects_inactive_or_missing_registering_user() -> None:
    session = MagicMock(spec=Session)
    session.scalar.return_value = None

    with pytest.raises(InventoryValidationError, match="usuario registrador"):
        create_inventory_movement(session, valid_payload(), USER_ID)


def test_api_exposes_requested_inventory_routes_and_requires_authentication() -> None:
    app = create_app()
    paths = app.openapi()["paths"]

    assert set(paths["/api/v1/inventory/existences"]) == {"get"}
    assert set(paths["/api/v1/inventory/existences/{balance_id}"]) == {"get"}
    assert set(paths["/api/v1/inventory/movements"]) == {"get", "post"}
    assert set(paths["/api/v1/inventory/movements/{movement_id}"]) == {"get"}

    def override_session():
        yield MagicMock(spec=Session)

    app.dependency_overrides[get_session] = override_session
    response = TestClient(app).get("/api/v1/inventory/existences")
    assert response.status_code == 401


def test_inventory_models_keep_required_constraints_and_relations() -> None:
    assert InventoryBalance.__table__.c.center_id.nullable is False
    assert InventoryMovement.__table__.c.center_id.nullable is False
    assert InventoryMovement.__table__.c.balance_id.nullable is False
    assert InventoryMovement.__table__.c.registered_by_user_id.nullable is False
    assert InventoryMovement.__table__.c.reference_id.nullable is True
