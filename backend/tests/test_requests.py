import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.main import create_app
from app.modules.catalog.models import Center, Product
from app.modules.identity.models import User
from app.modules.inventory.models import InventoryBalance
from app.modules.requests.models import GuineaPigRequest, InventoryReservation
from app.modules.requests.schemas import GuineaPigRequestCreate
from app.modules.requests.service import (
    RequestValidationError,
    authorize_request,
    confirm_request_availability,
    create_guinea_pig_request,
    register_request_payment,
)
from app.modules.traceability.models import TraceabilityEvent

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000501")
CENTER_ID = uuid.UUID("00000000-0000-0000-0000-000000000101")
PRODUCT_ID = uuid.UUID("00000000-0000-0000-0000-000000000202")


def dependencies(status: str = "REQUESTED", quantity: int = 8):
    center = Center(id=CENTER_ID, code="KOTOSH", name="Kotosh", is_active=True)
    user = User(
        id=USER_ID,
        full_name="Abraham",
        email="abraham@example.test",
        role_id=uuid.uuid4(),
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
        center_id=center.id,
        category="Juvenil H",
        physical_quantity=100,
        reserved_quantity=10,
        center=center,
    )
    request = GuineaPigRequest(
        id=uuid.uuid4(),
        request_code="SOL-KOT-20260915-001",
        inventory_balance_id=balance.id,
        product_id=product.id,
        customer_name="Cliente de prueba",
        requested_quantity=quantity,
        requested_for=date(2026, 9, 20),
        status=status,
        receipt_status="PENDING",
        created_by_user_id=user.id,
        inventory_balance=balance,
        product=product,
        created_by_user=user,
    )
    return user, product, balance, request


def test_request_schema_rejects_non_positive_quantity() -> None:
    with pytest.raises(ValidationError):
        GuineaPigRequestCreate(
            inventory_balance_id=uuid.uuid4(),
            customer_name="Cliente",
            requested_quantity=0,
            requested_for=date.today(),
        )


def test_create_request_does_not_change_inventory_and_creates_event() -> None:
    user, product, balance, _ = dependencies()
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [user, product, balance, None, None]
    physical_before = balance.physical_quantity
    reserved_before = balance.reserved_quantity

    request = create_guinea_pig_request(
        session,
        GuineaPigRequestCreate(
            inventory_balance_id=balance.id,
            customer_name="Cliente de prueba",
            requested_quantity=8,
            requested_for=date(2026, 9, 20),
        ),
        user.id,
    )

    assert request.request_code.startswith("SOL-KOT-")
    assert request.status == "REQUESTED"
    assert balance.physical_quantity == physical_before
    assert balance.reserved_quantity == reserved_before
    events = [
        call.args[0]
        for call in session.add.call_args_list
        if isinstance(call.args[0], TraceabilityEvent)
    ]
    assert [event.event_type for event in events] == ["request_created"]


def test_confirm_availability_reserves_without_reducing_physical_stock() -> None:
    user, _product, balance, request = dependencies()
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [user, request, balance, request]

    result = confirm_request_availability(session, request.id, user.id)

    assert result.status == "AVAILABILITY_CONFIRMED"
    assert balance.physical_quantity == 100
    assert balance.reserved_quantity == 18
    assert isinstance(request.reservation, InventoryReservation)
    assert request.reservation.quantity == 8
    events = [
        call.args[0]
        for call in session.add.call_args_list
        if isinstance(call.args[0], TraceabilityEvent)
    ]
    assert events[0].event_type == "request_availability_confirmed"


def test_confirm_availability_rejects_insufficient_stock() -> None:
    user, _product, balance, request = dependencies(quantity=91)
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [user, request, balance]

    with pytest.raises(RequestValidationError, match="insuficiente"):
        confirm_request_availability(session, request.id, user.id)
    assert balance.reserved_quantity == 10


def test_payment_and_authorization_keep_physical_stock_unchanged() -> None:
    user, _product, balance, request = dependencies(status="AVAILABILITY_CONFIRMED")
    request.reservation = InventoryReservation(
        request_id=request.id,
        inventory_balance_id=balance.id,
        quantity=request.requested_quantity,
        status="ACTIVE",
        created_by_user_id=user.id,
    )
    session = MagicMock(spec=Session)
    session.scalar.side_effect = [user, request, request, user, request, request]

    paid = register_request_payment(session, request.id, "B001-42", user.id)
    assert paid.status == "PAID"
    assert paid.receipt_status == "REGISTERED"
    assert paid.receipt_reference == "B001-42"

    authorized = authorize_request(session, request.id, user.id)
    assert authorized.status == "AUTHORIZED"
    assert authorized.authorized_by_user_id == user.id
    assert balance.physical_quantity == 100
    assert balance.reserved_quantity == 10


def test_api_exposes_only_the_mvp_request_workflow_and_requires_authentication() -> None:
    app = create_app()
    paths = app.openapi()["paths"]
    root = "/api/v1/requests/guinea-pigs"

    assert set(paths[root]) == {"get", "post"}
    assert set(paths[f"{root}/{{request_id}}"]) == {"get"}
    assert set(paths[f"{root}/{{request_id}}/confirm-availability"]) == {"post"}
    assert set(paths[f"{root}/{{request_id}}/register-payment"]) == {"post"}
    assert set(paths[f"{root}/{{request_id}}/authorize"]) == {"post"}

    def override_session():
        yield MagicMock(spec=Session)

    app.dependency_overrides[get_session] = override_session
    response = TestClient(app).get(root)
    assert response.status_code == 401


def test_request_models_keep_required_constraints() -> None:
    assert GuineaPigRequest.__table__.c.inventory_balance_id.nullable is False
    assert GuineaPigRequest.__table__.c.created_by_user_id.nullable is False
    assert InventoryReservation.__table__.c.request_id.nullable is False
    assert "physical_quantity" not in GuineaPigRequest.__table__.c
    assert "price" not in GuineaPigRequest.__table__.c
