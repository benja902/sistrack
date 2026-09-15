import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.main import create_app
from app.modules.catalog.models import Center, Product
from app.modules.identity.models import User
from app.modules.production.models import MilkProduction, MilkProductionDetail
from app.modules.production.schemas import MilkProductionCreate
from app.modules.production.service import (
    PRODUCTION_EVENT_TYPE,
    PRODUCTION_REFERENCE_TYPE,
    create_milk_production,
)
from app.modules.traceability.models import TraceabilityEvent


def valid_payload() -> MilkProductionCreate:
    return MilkProductionCreate.model_validate(
        {
            "production_date": "2026-09-15",
            "center_id": "00000000-0000-0000-0000-000000000101",
            "responsible": "Vilma",
            "details": [
                {"animal_reference": "Vaca 01", "liters": "7.5"},
                {"animal_reference": "Vaca 02", "liters": "8.0"},
                {"animal_reference": "Vaca 03", "liters": "6.5"},
            ],
        }
    )


def test_create_schema_does_not_accept_a_total_and_requires_details() -> None:
    assert "total_liters" not in MilkProductionCreate.model_fields

    with pytest.raises(ValidationError):
        MilkProductionCreate.model_validate(
            {
                "production_date": "2026-09-15",
                "center_id": "00000000-0000-0000-0000-000000000101",
                "responsible": "Vilma",
                "details": [],
            }
        )


def test_detail_schema_rejects_non_positive_liters() -> None:
    payload = valid_payload().model_dump(mode="json")
    payload["details"][0]["liters"] = 0

    with pytest.raises(ValidationError):
        MilkProductionCreate.model_validate(payload)


def test_production_models_keep_required_foreign_keys() -> None:
    assert MilkProduction.__table__.c.center_id.nullable is False
    assert MilkProduction.__table__.c.product_id.nullable is False
    assert MilkProduction.__table__.c.registered_by_user_id.nullable is False
    assert MilkProductionDetail.__table__.c.production_id.nullable is False


def test_service_calculates_total_lot_details_and_traceability_event() -> None:
    center_id = uuid.UUID("00000000-0000-0000-0000-000000000101")
    product_id = uuid.UUID("00000000-0000-0000-0000-000000000201")
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000301")
    center = Center(id=center_id, code="KOTOSH", name="Kotosh", is_active=True)
    product = Product(
        id=product_id,
        sku="LECHE",
        name="Leche",
        unit_of_measure="L",
        is_active=True,
    )
    user = User(
        id=user_id,
        full_name="Administrador temporal",
        email="admin.temporal@sitrack.local",
        role_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        is_active=True,
    )
    session = MagicMock(spec=Session)
    session.bind = None
    session.scalar.side_effect = [center, product, user, 0]

    production = create_milk_production(session, valid_payload(), user_id)

    assert production.total_liters == Decimal("22.0")
    assert production.lot_code == "LEC-KOT-20260915-001"
    assert [detail.liters for detail in production.details] == [
        Decimal("7.5"),
        Decimal("8.0"),
        Decimal("6.5"),
    ]
    events = [
        call.args[0]
        for call in session.add.call_args_list
        if isinstance(call.args[0], TraceabilityEvent)
    ]
    assert len(events) == 1
    assert events[0].event_type == PRODUCTION_EVENT_TYPE
    assert events[0].reference_type == PRODUCTION_REFERENCE_TYPE
    assert events[0].reference_id == production.id
    assert events[0].event_metadata["quantity"] == 22.0
    session.commit.assert_called_once()


def test_api_exposes_only_the_requested_milk_production_routes() -> None:
    paths = create_app().openapi()["paths"]

    assert "/api/v1/production/milk" in paths
    assert set(paths["/api/v1/production/milk"]) == {"get", "post"}
    assert "/api/v1/production/milk/{production_id}" in paths
