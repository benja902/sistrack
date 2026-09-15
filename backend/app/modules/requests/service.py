import uuid
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models import Center, Product
from app.modules.identity.models import User
from app.modules.inventory.models import InventoryBalance
from app.modules.traceability.models import TraceabilityEvent

from .models import GuineaPigRequest, InventoryReservation
from .schemas import GuineaPigRequestCreate

CUYES_SKU = "CUYES"
REQUEST_REFERENCE_TYPE = "guinea_pig_request"


class RequestValidationError(ValueError):
    pass


def _request_load_options():
    return (
        selectinload(GuineaPigRequest.inventory_balance).selectinload(InventoryBalance.center),
        selectinload(GuineaPigRequest.created_by_user),
        selectinload(GuineaPigRequest.authorized_by_user),
        selectinload(GuineaPigRequest.reservation),
    )


def list_guinea_pig_requests(
    session: Session,
    center_code: str | None = None,
    request_status: str | None = None,
) -> list[GuineaPigRequest]:
    statement = (
        select(GuineaPigRequest)
        .join(GuineaPigRequest.inventory_balance)
        .join(InventoryBalance.center)
        .options(*_request_load_options())
        .order_by(GuineaPigRequest.created_at.desc())
    )
    if center_code:
        statement = statement.where(func.upper(Center.code) == center_code.upper())
    if request_status:
        statement = statement.where(GuineaPigRequest.status == request_status.upper())
    return list(session.scalars(statement).all())


def get_guinea_pig_request(session: Session, request_id: uuid.UUID) -> GuineaPigRequest | None:
    return session.scalar(
        select(GuineaPigRequest)
        .options(*_request_load_options())
        .where(GuineaPigRequest.id == request_id)
    )


def _active_user(session: Session, user_id: uuid.UUID) -> User:
    user = session.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if user is None:
        raise RequestValidationError("El usuario registrador no existe o está inactivo.")
    return user


def _cuyes_product(session: Session) -> Product:
    product = session.scalar(
        select(Product).where(Product.sku == CUYES_SKU, Product.is_active.is_(True))
    )
    if product is None:
        raise RequestValidationError("El producto Cuyes no existe o está inactivo.")
    return product


def _next_request_code(session: Session, center_code: str, created_on: date) -> str:
    prefix = f"SOL-{center_code[:3].upper()}-{created_on:%Y%m%d}-"
    latest = session.scalar(
        select(GuineaPigRequest.request_code)
        .where(GuineaPigRequest.request_code.like(f"{prefix}%"))
        .order_by(GuineaPigRequest.request_code.desc())
        .limit(1)
    )
    sequence = int(latest.rsplit("-", 1)[1]) + 1 if latest else 1
    return f"{prefix}{sequence:03d}"


def _add_event(
    session: Session,
    request: GuineaPigRequest,
    user_id: uuid.UUID,
    event_type: str,
    description: str,
    metadata: dict[str, object],
) -> None:
    session.add(
        TraceabilityEvent(
            id=uuid.uuid4(),
            event_type=event_type,
            occurred_at=datetime.now(UTC),
            recorded_by_user_id=user_id,
            center_id=request.inventory_balance.center_id,
            product_id=request.product_id,
            reference_type=REQUEST_REFERENCE_TYPE,
            reference_id=request.id,
            description=description,
            event_metadata={
                "request_code": request.request_code,
                "category": request.inventory_balance.category,
                "quantity": request.requested_quantity,
                "status": request.status,
                **metadata,
            },
        )
    )


def create_guinea_pig_request(
    session: Session,
    payload: GuineaPigRequestCreate,
    created_by_user_id: uuid.UUID,
) -> GuineaPigRequest:
    user = _active_user(session, created_by_user_id)
    product = _cuyes_product(session)
    balance = session.scalar(
        select(InventoryBalance)
        .options(selectinload(InventoryBalance.center))
        .join(InventoryBalance.center)
        .where(
            InventoryBalance.id == payload.inventory_balance_id,
            Center.is_active.is_(True),
        )
    )
    if balance is None:
        raise RequestValidationError("La existencia seleccionada no existe o está inactiva.")

    request = GuineaPigRequest(
        id=uuid.uuid4(),
        request_code=_next_request_code(session, balance.center.code, datetime.now(UTC).date()),
        inventory_balance_id=balance.id,
        product_id=product.id,
        customer_name=payload.customer_name,
        requested_quantity=payload.requested_quantity,
        requested_for=payload.requested_for,
        status="REQUESTED",
        receipt_status="PENDING",
        created_by_user_id=user.id,
        inventory_balance=balance,
        product=product,
        created_by_user=user,
    )
    session.add(request)
    session.flush()
    _add_event(
        session,
        request,
        user.id,
        "request_created",
        f"Solicitud {request.request_code} creada para {request.requested_quantity} cuyes.",
        {"customer_name": request.customer_name},
    )
    session.commit()
    session.refresh(request)
    return get_guinea_pig_request(session, request.id) or request


def confirm_request_availability(
    session: Session, request_id: uuid.UUID, user_id: uuid.UUID
) -> GuineaPigRequest:
    user = _active_user(session, user_id)
    request = session.scalar(
        select(GuineaPigRequest)
        .options(*_request_load_options())
        .where(GuineaPigRequest.id == request_id)
        .with_for_update()
    )
    if request is None:
        raise RequestValidationError("Solicitud no encontrada.")
    if request.status != "REQUESTED":
        raise RequestValidationError(
            "Solo una solicitud solicitada puede confirmar disponibilidad."
        )

    balance = session.scalar(
        select(InventoryBalance)
        .where(InventoryBalance.id == request.inventory_balance_id)
        .with_for_update()
    )
    if balance is None:
        raise RequestValidationError("La existencia asociada ya no está disponible.")
    available = balance.physical_quantity - balance.reserved_quantity
    if request.requested_quantity > available:
        raise RequestValidationError(
            f"Disponibilidad insuficiente: hay {available} ejemplares disponibles."
        )

    balance.reserved_quantity += request.requested_quantity
    request.status = "AVAILABILITY_CONFIRMED"
    reservation = InventoryReservation(
        id=uuid.uuid4(),
        request_id=request.id,
        inventory_balance_id=balance.id,
        quantity=request.requested_quantity,
        status="ACTIVE",
        created_by_user_id=user.id,
    )
    request.reservation = reservation
    session.add(reservation)
    _add_event(
        session,
        request,
        user.id,
        "request_availability_confirmed",
        f"Disponibilidad confirmada y reserva creada para {request.requested_quantity} cuyes.",
        {
            "reserved_quantity_after": balance.reserved_quantity,
            "available_quantity_after": balance.physical_quantity - balance.reserved_quantity,
        },
    )
    session.commit()
    return get_guinea_pig_request(session, request.id) or request


def register_request_payment(
    session: Session,
    request_id: uuid.UUID,
    receipt_reference: str,
    user_id: uuid.UUID,
) -> GuineaPigRequest:
    user = _active_user(session, user_id)
    request = get_guinea_pig_request(session, request_id)
    if request is None:
        raise RequestValidationError("Solicitud no encontrada.")
    if request.status != "AVAILABILITY_CONFIRMED":
        raise RequestValidationError(
            "El pago solo puede registrarse después de confirmar disponibilidad."
        )

    now = datetime.now(UTC)
    request.status = "PAID"
    request.receipt_status = "REGISTERED"
    request.receipt_reference = receipt_reference
    request.paid_at = now
    _add_event(
        session,
        request,
        user.id,
        "request_payment_registered",
        f"Pago y boleta registrados para la solicitud {request.request_code}.",
        {"receipt_reference": receipt_reference},
    )
    session.commit()
    return get_guinea_pig_request(session, request.id) or request


def authorize_request(
    session: Session, request_id: uuid.UUID, user_id: uuid.UUID
) -> GuineaPigRequest:
    user = _active_user(session, user_id)
    request = get_guinea_pig_request(session, request_id)
    if request is None:
        raise RequestValidationError("Solicitud no encontrada.")
    if request.status != "PAID" or request.receipt_status != "REGISTERED":
        raise RequestValidationError("Solo una solicitud pagada puede autorizarse.")

    request.status = "AUTHORIZED"
    request.authorized_by_user_id = user.id
    request.authorized_by_user = user
    request.authorized_at = datetime.now(UTC)
    _add_event(
        session,
        request,
        user.id,
        "request_authorized",
        f"Solicitud {request.request_code} autorizada.",
        {},
    )
    session.commit()
    return get_guinea_pig_request(session, request.id) or request
