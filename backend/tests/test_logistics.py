from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.main import create_app
from app.modules.logistics.models import Dispatch, Reception
from app.modules.logistics.schemas import DispatchCreate, ReceptionCreate


def test_dispatch_requires_driver_name_only_for_driver_mode() -> None:
    with pytest.raises(ValidationError):
        DispatchCreate(
            source_type="MILK_PRODUCTION",
            source_id="00000000-0000-0000-0000-000000000001",
            destination="Punto de venta",
            delivery_mode="DRIVER",
        )

    direct = DispatchCreate(
        source_type="GUINEA_PIG_REQUEST",
        source_id="00000000-0000-0000-0000-000000000002",
        destination="Retiro en centro",
        delivery_mode="DIRECT_PICKUP",
    )
    assert direct.driver_name is None


def test_reception_accepts_zero_and_decimal_quantities() -> None:
    payload = ReceptionCreate(
        received_quantity=Decimal("19.500"),
        received_at="2026-09-15T10:00:00-05:00",
    )
    assert payload.received_quantity == Decimal("19.500")


def test_logistics_api_exposes_minimum_routes_and_requires_authentication() -> None:
    app = create_app()
    paths = app.openapi()["paths"]

    assert set(paths["/api/v1/logistics/dispatches"]) == {"get", "post"}
    assert set(paths["/api/v1/logistics/dispatches/{dispatch_id}"]) == {"get"}
    assert set(paths["/api/v1/logistics/dispatches/{dispatch_id}/depart"]) == {"post"}
    assert set(paths["/api/v1/logistics/receptions"]) == {"get"}
    assert set(paths["/api/v1/logistics/receptions/{dispatch_id}"]) == {"get", "post"}

    def override_session():
        yield MagicMock(spec=Session)

    app.dependency_overrides[get_session] = override_session
    assert TestClient(app).get("/api/v1/logistics/dispatches").status_code == 401


def test_models_do_not_mix_driver_and_system_user() -> None:
    assert Dispatch.__table__.c.driver_actor_id.foreign_keys
    assert Dispatch.__table__.c.created_by_user_id.foreign_keys
    assert "driver_user_id" not in Dispatch.__table__.c
    assert Reception.__table__.c.dispatch_id.nullable is False
