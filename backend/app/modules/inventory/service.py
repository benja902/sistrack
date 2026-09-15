import uuid
from datetime import UTC

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models import Center, Product
from app.modules.identity.models import User
from app.modules.traceability.models import TraceabilityEvent

from .models import InventoryBalance, InventoryMovement
from .schemas import (
    InventoryBalanceDetailResponse,
    InventoryBalanceRead,
    InventoryMovementCreate,
)

CUYES_SKU = "CUYES"
INVENTORY_EVENT_TYPE = "inventory_movement_registered"
INVENTORY_REFERENCE_TYPE = "inventory_movement"


class InventoryValidationError(ValueError):
    pass


def list_inventory_balances(
    session: Session,
    center_code: str | None = None,
) -> list[InventoryBalance]:
    statement = (
        select(InventoryBalance)
        .join(InventoryBalance.center)
        .options(selectinload(InventoryBalance.center))
        .order_by(Center.name, InventoryBalance.category)
    )
    if center_code:
        statement = statement.where(func.upper(Center.code) == center_code.upper())
    return list(session.scalars(statement).all())


def get_inventory_balance(session: Session, balance_id: uuid.UUID) -> InventoryBalance | None:
    return session.scalar(
        select(InventoryBalance)
        .options(selectinload(InventoryBalance.center))
        .where(InventoryBalance.id == balance_id)
    )


def get_inventory_balance_detail(
    session: Session,
    balance_id: uuid.UUID,
) -> InventoryBalanceDetailResponse | None:
    balance = get_inventory_balance(session, balance_id)
    if balance is None:
        return None
    movements = list(
        session.scalars(
            select(InventoryMovement)
            .options(
                selectinload(InventoryMovement.center),
                selectinload(InventoryMovement.registered_by_user),
            )
            .where(
                InventoryMovement.center_id == balance.center_id,
                InventoryMovement.category == balance.category,
            )
            .order_by(InventoryMovement.occurred_at.desc(), InventoryMovement.created_at.desc())
        ).all()
    )
    return InventoryBalanceDetailResponse.model_validate(
        {**InventoryBalanceRead.model_validate(balance).model_dump(), "movements": movements}
    )


def list_inventory_movements(
    session: Session,
    center_code: str | None = None,
) -> list[InventoryMovement]:
    statement = (
        select(InventoryMovement)
        .join(InventoryMovement.center)
        .options(
            selectinload(InventoryMovement.center),
            selectinload(InventoryMovement.registered_by_user),
        )
        .order_by(InventoryMovement.occurred_at.desc(), InventoryMovement.created_at.desc())
    )
    if center_code:
        statement = statement.where(func.upper(Center.code) == center_code.upper())
    return list(session.scalars(statement).all())


def get_inventory_movement(
    session: Session,
    movement_id: uuid.UUID,
) -> InventoryMovement | None:
    return session.scalar(
        select(InventoryMovement)
        .options(
            selectinload(InventoryMovement.center),
            selectinload(InventoryMovement.registered_by_user),
        )
        .where(InventoryMovement.id == movement_id)
    )


def create_inventory_movement(
    session: Session,
    payload: InventoryMovementCreate,
    registered_by_user_id: uuid.UUID,
    *,
    movement_id: uuid.UUID | None = None,
) -> InventoryMovement:
    user = session.scalar(
        select(User).where(User.id == registered_by_user_id, User.is_active.is_(True))
    )
    if user is None:
        raise InventoryValidationError("El usuario registrador no existe o está inactivo.")

    balance = session.scalar(
        select(InventoryBalance)
        .options(selectinload(InventoryBalance.center))
        .join(InventoryBalance.center)
        .where(
            InventoryBalance.center_id == payload.center_id,
            InventoryBalance.category == payload.category,
            Center.is_active.is_(True),
        )
        .with_for_update()
    )
    if balance is None:
        raise InventoryValidationError(
            "No existe una existencia activa para el centro y la categoría indicados."
        )

    product = session.scalar(
        select(Product).where(Product.sku == CUYES_SKU, Product.is_active.is_(True))
    )
    if product is None:
        raise InventoryValidationError("El producto Cuyes no existe o está inactivo.")

    physical_before = balance.physical_quantity
    physical_after = physical_before + payload.quantity
    if physical_after < balance.reserved_quantity:
        raise InventoryValidationError(
            "La cantidad del movimiento excede la existencia física disponible."
        )

    balance.physical_quantity = physical_after
    movement = InventoryMovement(
        id=movement_id or uuid.uuid4(),
        balance_id=balance.id,
        center_id=balance.center_id,
        category=balance.category,
        movement_type=payload.movement_type,
        quantity=payload.quantity,
        physical_quantity_before=physical_before,
        physical_quantity_after=physical_after,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        description=payload.description,
        registered_by_user_id=user.id,
        occurred_at=payload.occurred_at,
        center=balance.center,
        registered_by_user=user,
    )
    session.add(movement)
    session.flush()

    movement_label = (
        "Salida por venta" if payload.movement_type == "SALE" else "Mortalidad"
    )
    event = TraceabilityEvent(
        id=uuid.uuid4(),
        event_type=INVENTORY_EVENT_TYPE,
        occurred_at=payload.occurred_at.astimezone(UTC),
        recorded_by_user_id=user.id,
        center_id=balance.center_id,
        product_id=product.id,
        reference_type=INVENTORY_REFERENCE_TYPE,
        reference_id=movement.id,
        description=(
            f"{movement_label} registrada para {balance.category}: "
            f"{abs(payload.quantity)} ejemplares."
        ),
        event_metadata={
            "category": balance.category,
            "movement_type": payload.movement_type,
            "quantity": payload.quantity,
            "physical_quantity_before": physical_before,
            "physical_quantity_after": physical_after,
            "source_reference_type": payload.reference_type,
            "source_reference_id": (
                str(payload.reference_id) if payload.reference_id is not None else None
            ),
        },
    )
    session.add(event)
    session.commit()
    session.refresh(movement)
    return movement
