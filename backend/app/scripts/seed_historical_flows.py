from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_session_factory
from app.modules.catalog.models import Center
from app.modules.identity.models import OperationalActor
from app.modules.incidents.models import Incident
from app.modules.incidents.service import close_incident
from app.modules.inventory.seed import find_inventory_seed_user
from app.modules.logistics.models import Dispatch
from app.modules.logistics.schemas import DispatchCreate, ReceptionCreate
from app.modules.logistics.service import (
    confirm_dispatch_departure,
    create_dispatch,
    register_reception,
)
from app.modules.production.models import MilkProduction
from app.modules.production.schemas import MilkProductionCreate, MilkProductionDetailCreate
from app.modules.production.service import create_milk_production
from app.modules.traceability.models import TraceabilityEvent

HISTORICAL_FLOWS = (
    (date(2026, 6, 18), (Decimal("9.0"), Decimal("10.5")), Decimal("0"), False),
    (date(2026, 7, 11), (Decimal("10.5"), Decimal("10.5")), Decimal("-0.5"), True),
    (date(2026, 8, 23), (Decimal("8.0"), Decimal("10.5")), Decimal("0"), False),
    (date(2026, 9, 5), (Decimal("9.5"), Decimal("10.5")), Decimal("-1"), True),
)


def _at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=UTC)


def _next_historical_dispatch_code(session: Session, day: date) -> str:
    prefix = f"DES-{day:%Y%m%d}-"
    count = session.scalar(
        select(func.count(Dispatch.id)).where(Dispatch.dispatch_code.like(f"{prefix}%"))
    )
    return f"{prefix}{int(count or 0) + 1:03d}"


def _retime_events(
    session: Session,
    reference_ids: set[object],
    event_times: dict[str, datetime],
    old_dispatch_code: str,
    new_dispatch_code: str,
) -> None:
    events = session.scalars(
        select(TraceabilityEvent).where(TraceabilityEvent.reference_id.in_(reference_ids))
    ).all()
    for event in events:
        occurred_at = event_times.get(event.event_type)
        if occurred_at is not None:
            event.occurred_at = occurred_at
            event.recorded_at = occurred_at
        event.description = event.description.replace(old_dispatch_code, new_dispatch_code)
        if event.event_metadata and event.event_metadata.get("dispatch_code") == old_dispatch_code:
            event.event_metadata = {
                **event.event_metadata,
                "dispatch_code": new_dispatch_code,
            }


def _ensure_historical_flow(
    session: Session,
    production_day: date,
    liters: tuple[Decimal, Decimal],
    difference: Decimal,
    close_difference: bool,
) -> bool:
    existing = session.scalar(
        select(MilkProduction).where(MilkProduction.production_date == production_day)
    )
    if existing is not None:
        return False

    settings = get_settings()
    user = find_inventory_seed_user(session, settings.seed_admin_email)
    center = session.scalar(select(Center).where(Center.code == "KOTOSH"))
    actor = session.scalar(
        select(OperationalActor)
        .where(OperationalActor.is_active.is_(True))
        .order_by(OperationalActor.created_at)
    )
    if user is None or center is None or actor is None:
        raise RuntimeError("Faltan datos maestros para crear el historial.")

    production = create_milk_production(
        session,
        MilkProductionCreate(
            production_date=production_day,
            center_id=center.id,
            responsible_actor_id=actor.id,
            details=[
                MilkProductionDetailCreate(
                    animal_reference=f"Vaca {production_day.month:02d}-01", liters=liters[0]
                ),
                MilkProductionDetailCreate(
                    animal_reference=f"Vaca {production_day.month:02d}-02", liters=liters[1]
                ),
            ],
        ),
        user.id,
    )
    production_time = _at(production_day, 6, 30)
    production.created_at = production_time
    for detail in production.details:
        detail.created_at = production_time

    dispatch = create_dispatch(
        session,
        DispatchCreate(
            source_type="MILK_PRODUCTION",
            source_id=production.id,
            destination="Punto de Venta Central",
            delivery_mode="DRIVER",
            driver_name="Ricardo Torres",
        ),
        user.id,
    )
    old_dispatch_code = dispatch.dispatch_code
    dispatch.dispatch_code = _next_historical_dispatch_code(session, production_day)
    dispatch.created_at = _at(production_day, 8, 15)
    session.commit()

    dispatch = confirm_dispatch_departure(session, dispatch.id, user.id)
    dispatch.dispatched_at = _at(production_day, 9)
    reception_time = _at(production_day, 10, 30)
    dispatch = register_reception(
        session,
        dispatch.id,
        ReceptionCreate(
            received_quantity=dispatch.quantity + difference,
            received_at=reception_time,
            observation=(
                "Cantidad recibida conforme al despacho."
                if difference == 0
                else "Diferencia cuantitativa registrada durante la recepción."
            ),
        ),
        user.id,
    )
    reception = dispatch.reception
    if reception is None:
        raise RuntimeError("No se creó la recepción histórica.")
    reception.created_at = reception_time

    incident = session.scalar(select(Incident).where(Incident.reception_id == reception.id))
    if incident is not None:
        incident.created_at = reception_time + timedelta(minutes=1)
        if close_difference:
            incident = close_incident(
                session,
                incident.id,
                "Diferencia revisada y documentada por supervisión.",
                user.id,
            )
            incident.closed_at = reception_time + timedelta(hours=2)

    reference_ids: set[object] = {production.id, dispatch.id, reception.id}
    if incident is not None:
        reference_ids.add(incident.id)
    _retime_events(
        session,
        reference_ids,
        {
            "production_registered": production_time,
            "dispatch_created": _at(production_day, 8, 15),
            "dispatch_departed": _at(production_day, 9),
            "reception_registered": reception_time,
            "reception_difference_detected": reception_time,
            "incident_created": reception_time + timedelta(minutes=1),
            "incident_closed": reception_time + timedelta(hours=2),
        },
        old_dispatch_code,
        dispatch.dispatch_code,
    )
    session.commit()
    return True


def main() -> None:
    session_factory = get_session_factory()
    if session_factory is None:
        raise SystemExit("DATABASE_URL no está configurada.")
    created = 0
    with session_factory() as session:
        for flow in HISTORICAL_FLOWS:
            created += int(_ensure_historical_flow(session, *flow))
    existing = len(HISTORICAL_FLOWS) - created
    print(f"Flujos históricos creados: {created}. Flujos ya existentes: {existing}.")


if __name__ == "__main__":
    main()
