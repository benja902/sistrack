from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models import Center
from app.modules.identity.models import OperationalActor, User
from app.modules.inventory.models import InventoryBalance
from app.modules.logistics.models import Dispatch
from app.modules.production.models import MilkProduction
from app.modules.production.schemas import MilkProductionCreate, MilkProductionDetailCreate
from app.modules.production.service import create_milk_production
from app.modules.requests.models import GuineaPigRequest
from app.modules.requests.schemas import GuineaPigRequestCreate
from app.modules.requests.service import (
    authorize_request,
    confirm_request_availability,
    create_guinea_pig_request,
    get_guinea_pig_request,
    register_request_payment,
)

from .schemas import DispatchCreate, ReceptionCreate
from .service import confirm_dispatch_departure, create_dispatch, register_reception

LEGACY_PREFIX = "[DEMO TESIS]"
DRIVER_NAME = "Ricardo Torres"

REQUEST_CASES = (
    (
        "Solicitud recién registrada",
        "Daniela Vargas",
        "KOTOSH",
        "Lactantes",
        4,
        "REQUESTED",
        None,
    ),
    (
        "Disponibilidad confirmada",
        "Miguel Salazar",
        "CANCHAN",
        "Destete H",
        3,
        "AVAILABILITY_CONFIRMED",
        None,
    ),
    (
        "Pago y boleta registrados",
        "Rosa Huamán",
        "KOTOSH",
        "Adultos / reproductores M",
        2,
        "PAID",
        None,
    ),
    (
        "Despacho pendiente de salida",
        "Carlos Mendoza",
        "CANCHAN",
        "Juvenil H",
        5,
        "AUTHORIZED",
        "PENDING_DISPATCH",
    ),
    (
        "Retiro directo completado",
        "Patricia León",
        "KOTOSH",
        "Juvenil M",
        3,
        "AUTHORIZED",
        "DIRECT_COMPLETED",
    ),
    (
        "Traslado bajo custodia",
        "Jorge Paredes",
        "CANCHAN",
        "Adultos / reproductores H",
        4,
        "AUTHORIZED",
        "IN_TRANSIT",
    ),
    (
        "Recepción conforme",
        "Lucía Campos",
        "KOTOSH",
        "Destete M",
        2,
        "AUTHORIZED",
        "CONFORMING_RECEPTION",
    ),
)


class DemoSeedError(RuntimeError):
    pass


def _ensure_request(
    session: Session,
    user: User,
    center_code: str,
    category: str,
    quantity: int,
    label: str,
    customer_name: str,
    target_status: str,
) -> GuineaPigRequest:
    balance = session.scalar(
        select(InventoryBalance)
        .join(InventoryBalance.center)
        .where(Center.code == center_code, InventoryBalance.category == category)
    )
    if balance is None:
        raise DemoSeedError(f"No existe el saldo {center_code} / {category}.")
    request = session.scalar(
        select(GuineaPigRequest).where(
            GuineaPigRequest.inventory_balance_id == balance.id,
            GuineaPigRequest.customer_name.in_((customer_name, f"{LEGACY_PREFIX} {label}")),
        )
    )
    if request is not None and request.customer_name != customer_name:
        request.customer_name = customer_name
        session.commit()
    if request is not None and (request.receipt_reference or "").startswith("B-DEMO-"):
        request.receipt_reference = request.receipt_reference.replace("B-DEMO-", "B001-", 1)
        session.commit()
    if request is None:
        if balance.physical_quantity - balance.reserved_quantity < quantity:
            raise DemoSeedError(f"No hay disponibilidad para el caso {label}.")
        request = create_guinea_pig_request(
            session,
            GuineaPigRequestCreate(
                inventory_balance_id=balance.id,
                customer_name=customer_name,
                requested_quantity=quantity,
                requested_for=date.today() + timedelta(days=3),
            ),
            user.id,
        )

    status_order = ["REQUESTED", "AVAILABILITY_CONFIRMED", "PAID", "AUTHORIZED"]
    current_index = status_order.index(request.status)
    target_index = status_order.index(target_status)
    if current_index < 1 <= target_index:
        request = confirm_request_availability(session, request.id, user.id)
    if current_index < 2 <= target_index:
        request = register_request_payment(
            session,
            request.id,
            f"B001-{request.request_code[-3:]}",
            user.id,
        )
    if current_index < 3 <= target_index:
        request = authorize_request(session, request.id, user.id)
    return get_guinea_pig_request(session, request.id) or request


def _ensure_request_dispatch(
    session: Session,
    user: User,
    request: GuineaPigRequest,
    logistics_case: str,
) -> None:
    destinations = {
        "PENDING_DISPATCH": "Punto de Venta Central",
        "DIRECT_COMPLETED": "Retiro en el centro de producción",
        "IN_TRANSIT": "Punto de Venta Principal",
        "CONFORMING_RECEPTION": "Punto de Venta Principal",
    }
    destination = destinations[logistics_case]
    dispatch = session.scalar(select(Dispatch).where(Dispatch.guinea_pig_request_id == request.id))
    if dispatch is None:
        direct = logistics_case == "DIRECT_COMPLETED"
        dispatch = create_dispatch(
            session,
            DispatchCreate(
                source_type="GUINEA_PIG_REQUEST",
                source_id=request.id,
                destination=destination,
                delivery_mode="DIRECT_PICKUP" if direct else "DRIVER",
                driver_name=None if direct else DRIVER_NAME,
            ),
            user.id,
        )
    elif dispatch.destination.startswith(LEGACY_PREFIX):
        dispatch.destination = destination
        session.commit()
    if logistics_case == "PENDING_DISPATCH":
        return
    if dispatch.status == "PENDING":
        dispatch = confirm_dispatch_departure(session, dispatch.id, user.id)
    if logistics_case == "CONFORMING_RECEPTION" and dispatch.reception is None:
        register_reception(
            session,
            dispatch.id,
            ReceptionCreate(
                received_quantity=dispatch.quantity,
                received_at=datetime.now(UTC),
                observation="Cantidad recibida conforme al despacho.",
            ),
            user.id,
        )
    elif (
        logistics_case == "CONFORMING_RECEPTION"
        and dispatch.reception is not None
        and "demostrativo" in (dispatch.reception.observation or "").lower()
    ):
        dispatch.reception.observation = "Cantidad recibida conforme al despacho."
        session.commit()


def _available_milk_production(session: Session, user: User) -> MilkProduction:
    production = session.scalar(
        select(MilkProduction)
        .outerjoin(Dispatch, Dispatch.milk_production_id == MilkProduction.id)
        .options(selectinload(MilkProduction.center), selectinload(MilkProduction.product))
        .where(Dispatch.id.is_(None), MilkProduction.total_liters > Decimal("0.5"))
        .order_by(MilkProduction.production_date)
    )
    if production is not None:
        return production

    actor = session.scalar(
        select(OperationalActor)
        .where(OperationalActor.is_active.is_(True))
        .order_by(OperationalActor.created_at)
    )
    center = session.scalar(select(Center).where(Center.code == "KOTOSH"))
    if actor is None or center is None:
        raise DemoSeedError("No existe responsable operativo o centro Kotosh para crear el lote.")
    return create_milk_production(
        session,
        MilkProductionCreate(
            production_date=date.today(),
            center_id=center.id,
            responsible_actor_id=actor.id,
            details=[
                MilkProductionDetailCreate(animal_reference="Vaca 07", liters=Decimal("8")),
                MilkProductionDetailCreate(animal_reference="Vaca 12", liters=Decimal("7.5")),
            ],
        ),
        user.id,
    )


def _ensure_milk_difference_case(session: Session, user: User) -> None:
    destination = "Punto de Venta Central"
    legacy_destination = f"{LEGACY_PREFIX} Recepción de leche con diferencia"
    dispatch = session.scalar(
        select(Dispatch).where(
            Dispatch.source_type == "MILK_PRODUCTION",
            Dispatch.destination.in_((destination, legacy_destination)),
        )
    )
    if dispatch is None:
        production = _available_milk_production(session, user)
        dispatch = create_dispatch(
            session,
            DispatchCreate(
                source_type="MILK_PRODUCTION",
                source_id=production.id,
                destination=destination,
                delivery_mode="DRIVER",
                driver_name=DRIVER_NAME,
            ),
            user.id,
        )
    elif dispatch.destination == legacy_destination:
        dispatch.destination = destination
        session.commit()
    if dispatch.status == "PENDING":
        dispatch = confirm_dispatch_departure(session, dispatch.id, user.id)
    if dispatch.reception is None:
        register_reception(
            session,
            dispatch.id,
            ReceptionCreate(
                received_quantity=dispatch.quantity - Decimal("0.5"),
                received_at=datetime.now(UTC),
                observation="Se registró una diferencia cuantitativa durante la recepción.",
            ),
            user.id,
        )
    elif "demostrar" in (dispatch.reception.observation or "").lower():
        dispatch.reception.observation = (
            "Se registró una diferencia cuantitativa durante la recepción."
        )
        session.commit()


def seed_demo_requests_and_logistics(session: Session, user: User) -> None:
    legacy_driver = session.scalar(
        select(OperationalActor).where(OperationalActor.full_name == "Conductor demostrativo")
    )
    if legacy_driver is not None:
        legacy_driver.full_name = DRIVER_NAME
        session.commit()

    for (
        label,
        customer_name,
        center_code,
        category,
        quantity,
        target_status,
        logistics_case,
    ) in REQUEST_CASES:
        request = _ensure_request(
            session,
            user,
            center_code,
            category,
            quantity,
            label,
            customer_name,
            target_status,
        )
        if logistics_case:
            _ensure_request_dispatch(session, user, request, logistics_case)
    _ensure_milk_difference_case(session, user)
