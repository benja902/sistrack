import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models import Center
from app.modules.identity.models import OperationalActor, User
from app.modules.inventory.models import InventoryBalance, InventoryMovement
from app.modules.production.models import MilkProduction
from app.modules.requests.models import GuineaPigRequest
from app.modules.traceability.models import TraceabilityEvent

from .models import Dispatch, Reception
from .schemas import DispatchCreate, ReceptionCreate

DISPATCH_REFERENCE_TYPE = "dispatch"
RECEPTION_REFERENCE_TYPE = "reception"


class LogisticsValidationError(ValueError):
    pass


def _dispatch_options():
    return (
        selectinload(Dispatch.center),
        selectinload(Dispatch.product),
        selectinload(Dispatch.driver_actor),
        selectinload(Dispatch.created_by_user),
        selectinload(Dispatch.dispatched_by_user),
        selectinload(Dispatch.milk_production),
        selectinload(Dispatch.guinea_pig_request),
        selectinload(Dispatch.reception).selectinload(Reception.received_by_user),
    )


def _active_user(session: Session, user_id: uuid.UUID) -> User:
    user = session.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if user is None:
        raise LogisticsValidationError("El usuario registrador no existe o está inactivo.")
    return user


def _next_dispatch_code(session: Session, created_at: datetime) -> str:
    prefix = f"DES-{created_at:%Y%m%d}-"
    latest = session.scalar(
        select(Dispatch.dispatch_code)
        .where(Dispatch.dispatch_code.like(f"{prefix}%"))
        .order_by(Dispatch.dispatch_code.desc())
        .limit(1)
    )
    sequence = int(latest.rsplit("-", 1)[1]) + 1 if latest else 1
    return f"{prefix}{sequence:03d}"


def list_dispatches(session: Session, center_code: str | None = None) -> list[Dispatch]:
    statement = select(Dispatch).options(*_dispatch_options()).order_by(Dispatch.created_at.desc())
    if center_code:
        statement = statement.where(
            Dispatch.center.has(func.upper(Center.code) == center_code.upper())
        )
    return list(session.scalars(statement).all())


def get_dispatch(session: Session, dispatch_id: uuid.UUID) -> Dispatch | None:
    return session.scalar(
        select(Dispatch).options(*_dispatch_options()).where(Dispatch.id == dispatch_id)
    )


def _add_event(
    session: Session,
    dispatch: Dispatch,
    user_id: uuid.UUID,
    event_type: str,
    description: str,
    *,
    operational_actor_id: uuid.UUID | None = None,
    reference_type: str = DISPATCH_REFERENCE_TYPE,
    reference_id: uuid.UUID | None = None,
    metadata: dict[str, object] | None = None,
) -> None:
    session.add(
        TraceabilityEvent(
            id=uuid.uuid4(),
            event_type=event_type,
            occurred_at=datetime.now(UTC),
            recorded_by_user_id=user_id,
            operational_actor_id=operational_actor_id,
            center_id=dispatch.center_id,
            product_id=dispatch.product_id,
            reference_type=reference_type,
            reference_id=reference_id or dispatch.id,
            description=description,
            event_metadata={
                "dispatch_code": dispatch.dispatch_code,
                "source_type": dispatch.source_type,
                "source_code": dispatch.source_code,
                "quantity": float(dispatch.quantity),
                "unit": dispatch.unit_of_measure,
                **(metadata or {}),
            },
        )
    )


def create_dispatch(
    session: Session, payload: DispatchCreate, created_by_user_id: uuid.UUID
) -> Dispatch:
    user = _active_user(session, created_by_user_id)
    driver = None
    if payload.driver_name is not None:
        driver = session.scalar(
            select(OperationalActor).where(
                func.lower(OperationalActor.full_name) == payload.driver_name.lower(),
                OperationalActor.is_active.is_(True),
            )
        )
        if driver is None:
            driver = OperationalActor(
                id=uuid.uuid4(),
                full_name=payload.driver_name,
                is_active=True,
            )
            session.add(driver)
            session.flush()

    milk_production = None
    guinea_pig_request = None
    if payload.source_type == "MILK_PRODUCTION":
        milk_production = session.scalar(
            select(MilkProduction)
            .options(selectinload(MilkProduction.center), selectinload(MilkProduction.product))
            .where(MilkProduction.id == payload.source_id)
        )
        if milk_production is None:
            raise LogisticsValidationError("El lote de leche no existe.")
        existing = session.scalar(
            select(Dispatch.id).where(Dispatch.milk_production_id == milk_production.id)
        )
        if existing is not None:
            raise LogisticsValidationError("El lote ya tiene un despacho registrado.")
        center = milk_production.center
        product = milk_production.product
        quantity = milk_production.total_liters
        unit = product.unit_of_measure
    else:
        guinea_pig_request = session.scalar(
            select(GuineaPigRequest)
            .options(
                selectinload(GuineaPigRequest.inventory_balance).selectinload(
                    InventoryBalance.center
                ),
                selectinload(GuineaPigRequest.product),
                selectinload(GuineaPigRequest.reservation),
            )
            .where(GuineaPigRequest.id == payload.source_id)
        )
        if guinea_pig_request is None or guinea_pig_request.status != "AUTHORIZED":
            raise LogisticsValidationError("La solicitud de cuyes debe estar autorizada.")
        if (
            guinea_pig_request.reservation is None
            or guinea_pig_request.reservation.status != "ACTIVE"
        ):
            raise LogisticsValidationError("La solicitud no tiene una reserva activa.")
        existing = session.scalar(
            select(Dispatch.id).where(Dispatch.guinea_pig_request_id == guinea_pig_request.id)
        )
        if existing is not None:
            raise LogisticsValidationError("La solicitud ya tiene un despacho registrado.")
        center = guinea_pig_request.inventory_balance.center
        product = guinea_pig_request.product
        quantity = Decimal(guinea_pig_request.requested_quantity)
        unit = product.unit_of_measure

    now = datetime.now(UTC)
    dispatch = Dispatch(
        id=uuid.uuid4(),
        dispatch_code=_next_dispatch_code(session, now),
        source_type=payload.source_type,
        milk_production_id=milk_production.id if milk_production else None,
        guinea_pig_request_id=guinea_pig_request.id if guinea_pig_request else None,
        center_id=center.id,
        product_id=product.id,
        quantity=quantity,
        unit_of_measure=unit,
        destination=payload.destination,
        delivery_mode=payload.delivery_mode,
        driver_actor_id=driver.id if driver else None,
        status="PENDING",
        created_by_user_id=user.id,
        milk_production=milk_production,
        guinea_pig_request=guinea_pig_request,
        center=center,
        product=product,
        driver_actor=driver,
        created_by_user=user,
    )
    session.add(dispatch)
    session.flush()
    _add_event(
        session,
        dispatch,
        user.id,
        "dispatch_created",
        f"Despacho {dispatch.dispatch_code} preparado para {dispatch.destination}.",
        metadata={"delivery_mode": dispatch.delivery_mode},
    )
    session.commit()
    return get_dispatch(session, dispatch.id) or dispatch


def confirm_dispatch_departure(
    session: Session, dispatch_id: uuid.UUID, user_id: uuid.UUID
) -> Dispatch:
    user = _active_user(session, user_id)
    dispatch = session.scalar(
        select(Dispatch)
        .options(*_dispatch_options())
        .where(Dispatch.id == dispatch_id)
        .with_for_update()
    )
    if dispatch is None:
        raise LogisticsValidationError("Despacho no encontrado.")
    if dispatch.status != "PENDING":
        raise LogisticsValidationError("Solo un despacho pendiente puede registrar su salida.")

    now = datetime.now(UTC)
    if dispatch.guinea_pig_request_id is not None:
        request = session.scalar(
            select(GuineaPigRequest)
            .options(selectinload(GuineaPigRequest.reservation))
            .where(GuineaPigRequest.id == dispatch.guinea_pig_request_id)
            .with_for_update()
        )
        if request is None or request.status != "AUTHORIZED" or request.reservation is None:
            raise LogisticsValidationError(
                "La solicitud autorizada o su reserva no están disponibles."
            )
        reservation = request.reservation
        if reservation.status != "ACTIVE":
            raise LogisticsValidationError("La reserva de la solicitud ya fue liberada.")
        balance = session.scalar(
            select(InventoryBalance)
            .where(InventoryBalance.id == reservation.inventory_balance_id)
            .with_for_update()
        )
        quantity = reservation.quantity
        if balance is None or balance.physical_quantity < quantity:
            raise LogisticsValidationError("La existencia física no permite confirmar la salida.")
        if balance.reserved_quantity < quantity:
            raise LogisticsValidationError("La reserva ya no es consistente con Inventario.")

        physical_before = balance.physical_quantity
        balance.physical_quantity -= quantity
        balance.reserved_quantity -= quantity
        reservation.status = "RELEASED"
        reservation.released_at = now
        movement = InventoryMovement(
            id=uuid.uuid4(),
            balance_id=balance.id,
            center_id=dispatch.center_id,
            category=balance.category,
            movement_type="SALE",
            quantity=-quantity,
            physical_quantity_before=physical_before,
            physical_quantity_after=balance.physical_quantity,
            reference_type=DISPATCH_REFERENCE_TYPE,
            reference_id=dispatch.id,
            description=f"Salida física asociada al despacho {dispatch.dispatch_code}.",
            registered_by_user_id=user.id,
            occurred_at=now,
        )
        session.add(movement)
        session.flush()
        _add_event(
            session,
            dispatch,
            user.id,
            "inventory_movement_registered",
            f"Salida por venta: {quantity} cuyes.",
            reference_type="inventory_movement",
            reference_id=movement.id,
            metadata={
                "movement_type": "SALE",
                "physical_quantity_before": physical_before,
                "physical_quantity_after": balance.physical_quantity,
                "reservation_released": True,
            },
        )

    dispatch.status = "IN_TRANSIT" if dispatch.delivery_mode == "DRIVER" else "COMPLETED"
    dispatch.dispatched_at = now
    dispatch.dispatched_by_user_id = user.id
    dispatch.dispatched_by_user = user
    _add_event(
        session,
        dispatch,
        user.id,
        "dispatch_departed",
        f"Salida física del despacho {dispatch.dispatch_code} registrada.",
        operational_actor_id=dispatch.driver_actor_id,
        metadata={
            "delivery_mode": dispatch.delivery_mode,
            "status": dispatch.status,
            "physical_custody": dispatch.driver_actor.full_name
            if dispatch.driver_actor is not None
            else "Retiro directo",
        },
    )
    session.commit()
    return get_dispatch(session, dispatch.id) or dispatch


def list_receptions(session: Session, center_code: str | None = None) -> list[Dispatch]:
    statement = (
        select(Dispatch)
        .options(*_dispatch_options())
        .where(Dispatch.delivery_mode == "DRIVER", Dispatch.status != "PENDING")
        .order_by(Dispatch.dispatched_at.desc())
    )
    if center_code:
        statement = statement.where(
            Dispatch.center.has(func.upper(Center.code) == center_code.upper())
        )
    return list(session.scalars(statement).all())


def register_reception(
    session: Session,
    dispatch_id: uuid.UUID,
    payload: ReceptionCreate,
    user_id: uuid.UUID,
) -> Dispatch:
    user = _active_user(session, user_id)
    dispatch = session.scalar(
        select(Dispatch)
        .options(*_dispatch_options())
        .where(Dispatch.id == dispatch_id)
        .with_for_update()
    )
    if dispatch is None:
        raise LogisticsValidationError("Despacho no encontrado.")
    if dispatch.delivery_mode != "DRIVER" or dispatch.status != "IN_TRANSIT":
        raise LogisticsValidationError("Solo un despacho en transporte puede recibirse.")
    if dispatch.reception is not None:
        raise LogisticsValidationError("El despacho ya tiene una recepción registrada.")
    if dispatch.product.sku == "CUYES" and payload.received_quantity != int(
        payload.received_quantity
    ):
        raise LogisticsValidationError("La cantidad recibida de cuyes debe ser entera.")

    difference = payload.received_quantity - dispatch.quantity
    reception = Reception(
        id=uuid.uuid4(),
        dispatch_id=dispatch.id,
        dispatched_quantity=dispatch.quantity,
        received_quantity=payload.received_quantity,
        difference=difference,
        status="CONFORMING" if difference == 0 else "WITH_DIFFERENCE",
        observation=payload.observation,
        received_by_user_id=user.id,
        received_by_user=user,
        received_at=payload.received_at,
    )
    dispatch.reception = reception
    dispatch.status = "COMPLETED"
    session.add(reception)
    session.flush()
    _add_event(
        session,
        dispatch,
        user.id,
        "reception_registered",
        f"Recepción del despacho {dispatch.dispatch_code} registrada.",
        reference_type=RECEPTION_REFERENCE_TYPE,
        reference_id=reception.id,
        metadata={
            "received_quantity": float(payload.received_quantity),
            "difference": float(difference),
            "reception_status": reception.status,
        },
    )
    if difference != 0:
        _add_event(
            session,
            dispatch,
            user.id,
            "reception_difference_detected",
            f"Diferencia cuantitativa detectada en {dispatch.dispatch_code}: {difference}.",
            reference_type=RECEPTION_REFERENCE_TYPE,
            reference_id=reception.id,
            metadata={"difference": float(difference), "observation": payload.observation},
        )
    session.commit()
    return get_dispatch(session, dispatch.id) or dispatch
