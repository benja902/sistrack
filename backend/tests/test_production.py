import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.main import create_app
from app.modules.catalog.models import Center, Product
from app.modules.identity.models import OperationalActor, User
from app.modules.production.models import MilkProduction, MilkProductionDetail
from app.modules.production.schemas import BUSINESS_TIME_ZONE, MilkProductionCreate
from app.modules.production.service import (
    PRODUCTION_EVENT_TYPE,
    PRODUCTION_REFERENCE_TYPE,
    create_milk_production,
)
from app.modules.traceability.models import TraceabilityEvent


def valid_payload(
    *,
    production_date: date | None = None,
    center_id: str = "00000000-0000-0000-0000-000000000101",
) -> MilkProductionCreate:
    return MilkProductionCreate.model_validate(
        {
            "production_date": (
                production_date or datetime.now(BUSINESS_TIME_ZONE).date()
            ).isoformat(),
            "center_id": center_id,
            "responsible_actor_id": "00000000-0000-0000-0000-000000000401",
            "details": [
                {"animal_reference": "Vaca 01", "liters": "7.5"},
                {"animal_reference": "Vaca 02", "liters": "8.0"},
                {"animal_reference": "Vaca 03", "liters": "6.5"},
            ],
        }
    )


def test_create_schema_does_not_accept_a_total_and_requires_details() -> None:
    assert "total_liters" not in MilkProductionCreate.model_fields

    payload_with_total = valid_payload().model_dump(mode="json")
    payload_with_total["total_liters"] = "22.0"
    with pytest.raises(ValidationError):
        MilkProductionCreate.model_validate(payload_with_total)

    with pytest.raises(ValidationError):
        MilkProductionCreate.model_validate(
            {
                "production_date": datetime.now(BUSINESS_TIME_ZONE).date().isoformat(),
                "center_id": "00000000-0000-0000-0000-000000000101",
                "responsible_actor_id": "00000000-0000-0000-0000-000000000401",
                "details": [],
            }
        )


def test_detail_schema_rejects_non_positive_liters() -> None:
    payload = valid_payload().model_dump(mode="json")
    payload["details"][0]["liters"] = 0

    with pytest.raises(ValidationError):
        MilkProductionCreate.model_validate(payload)


def test_schema_rejects_future_dates_and_allows_previous_dates() -> None:
    today = datetime.now(BUSINESS_TIME_ZONE).date()

    assert valid_payload(production_date=today - timedelta(days=1)).production_date < today
    with pytest.raises(ValidationError):
        valid_payload(production_date=today + timedelta(days=1))


def test_schema_rejects_duplicate_animal_references_within_a_production() -> None:
    payload = valid_payload().model_dump(mode="json")
    payload["details"][1]["animal_reference"] = " vaca 01 "

    with pytest.raises(ValidationError):
        MilkProductionCreate.model_validate(payload)


def test_production_models_keep_required_foreign_keys() -> None:
    assert MilkProduction.__table__.c.center_id.nullable is False
    assert MilkProduction.__table__.c.product_id.nullable is False
    assert MilkProduction.__table__.c.registered_by_user_id.nullable is False
    assert MilkProduction.__table__.c.responsible_actor_id.nullable is True
    assert MilkProductionDetail.__table__.c.production_id.nullable is False


def test_service_calculates_total_lot_details_and_traceability_event() -> None:
    center_id = uuid.UUID("00000000-0000-0000-0000-000000000101")
    product_id = uuid.UUID("00000000-0000-0000-0000-000000000201")
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000301")
    actor_id = uuid.UUID("00000000-0000-0000-0000-000000000401")
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
    responsible_actor = OperationalActor(id=actor_id, full_name="Vilma", is_active=True)
    session = MagicMock(spec=Session)
    session.bind = None
    session.scalar.side_effect = [center, product, responsible_actor, user, 0]

    timestamp_before_creation = datetime.now(UTC)

    payload = valid_payload()
    production = create_milk_production(session, payload, user_id)

    timestamp_after_creation = datetime.now(UTC)

    assert production.total_liters == Decimal("22.0")
    assert production.lot_code == f"LEC-KOT-{payload.production_date:%Y%m%d}-001"
    assert production.responsible_actor_id == actor_id
    assert production.registered_by_user_id == user_id
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
    assert events[0].operational_actor_id == actor_id
    assert timestamp_before_creation <= events[0].occurred_at <= timestamp_after_creation
    session.commit.assert_called_once()


def test_service_rejects_milk_production_for_canchan() -> None:
    canchan = Center(
        id=uuid.UUID("00000000-0000-0000-0000-000000000102"),
        code="CANCHAN",
        name="Canchán",
        is_active=True,
    )
    session = MagicMock(spec=Session)
    session.scalar.return_value = canchan

    with pytest.raises(ValueError, match="solo puede registrarse en Kotosh"):
        create_milk_production(
            session,
            valid_payload(center_id="00000000-0000-0000-0000-000000000102"),
            uuid.UUID("00000000-0000-0000-0000-000000000301"),
        )


def test_api_exposes_only_the_requested_milk_production_routes() -> None:
    paths = create_app().openapi()["paths"]

    assert "/api/v1/production/milk" in paths
    assert set(paths["/api/v1/production/milk"]) == {"get", "post"}
    assert "/api/v1/production/milk/{production_id}" in paths
    assert set(paths["/api/v1/production/milk/{production_id}"]) == {"get"}
