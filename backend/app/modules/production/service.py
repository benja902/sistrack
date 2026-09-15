import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models import Center, Product
from app.modules.identity.models import OperationalActor, User
from app.modules.traceability.models import TraceabilityEvent

from .models import MilkProduction, MilkProductionDetail
from .schemas import MilkProductionCreate

MILK_SKU = "LECHE"
MILK_PRODUCTION_CENTER_CODE = "KOTOSH"
PRODUCTION_EVENT_TYPE = "production_registered"
PRODUCTION_REFERENCE_TYPE = "milk_production"


class ProductionValidationError(ValueError):
    pass


def list_milk_productions(session: Session, center_code: str | None = None) -> list[MilkProduction]:
    statement = (
        select(MilkProduction)
        .join(MilkProduction.center)
        .options(
            selectinload(MilkProduction.center),
            selectinload(MilkProduction.product),
            selectinload(MilkProduction.responsible_actor),
            selectinload(MilkProduction.registered_by_user),
        )
        .order_by(MilkProduction.production_date.desc(), MilkProduction.created_at.desc())
    )
    if center_code:
        statement = statement.where(func.upper(Center.code) == center_code.upper())
    return list(session.scalars(statement).all())


def get_milk_production(session: Session, production_id: uuid.UUID) -> MilkProduction | None:
    statement = (
        select(MilkProduction)
        .options(
            selectinload(MilkProduction.center),
            selectinload(MilkProduction.product),
            selectinload(MilkProduction.responsible_actor),
            selectinload(MilkProduction.registered_by_user),
            selectinload(MilkProduction.details),
        )
        .where(MilkProduction.id == production_id)
    )
    return session.scalar(statement)


def _next_lot_code(session: Session, center: Center, production_date: date) -> str:
    lock_key = f"milk-production:{center.code}:{production_date.isoformat()}"
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
            {"lock_key": lock_key},
        )

    existing_count = session.scalar(
        select(func.count(MilkProduction.id)).where(
            MilkProduction.center_id == center.id,
            MilkProduction.production_date == production_date,
        )
    )
    sequence = int(existing_count or 0) + 1
    center_prefix = center.code[:3].upper()
    return f"LEC-{center_prefix}-{production_date:%Y%m%d}-{sequence:03d}"


def create_milk_production(
    session: Session,
    payload: MilkProductionCreate,
    registered_by_user_id: uuid.UUID,
) -> MilkProduction:
    center = session.scalar(
        select(Center).where(Center.id == payload.center_id, Center.is_active.is_(True))
    )
    if center is None:
        raise ProductionValidationError("El centro indicado no existe o está inactivo.")
    if center.code.upper() != MILK_PRODUCTION_CENTER_CODE:
        raise ProductionValidationError(
            "La producción de leche del alcance actual solo puede registrarse en Kotosh."
        )

    product = session.scalar(
        select(Product).where(Product.sku == MILK_SKU, Product.is_active.is_(True))
    )
    if product is None:
        raise ProductionValidationError("El producto Leche no existe o está inactivo.")

    responsible_actor = session.scalar(
        select(OperationalActor).where(
            OperationalActor.id == payload.responsible_actor_id,
            OperationalActor.is_active.is_(True),
        )
    )
    if responsible_actor is None:
        raise ProductionValidationError(
            "El responsable de producción no existe o está inactivo."
        )

    user = session.scalar(
        select(User).where(User.id == registered_by_user_id, User.is_active.is_(True))
    )
    if user is None:
        raise ProductionValidationError(
            "El usuario registrador temporal no existe o está inactivo."
        )

    total_liters = sum((detail.liters for detail in payload.details), start=Decimal("0"))
    lot_code = _next_lot_code(session, center, payload.production_date)
    production = MilkProduction(
        id=uuid.uuid4(),
        lot_code=lot_code,
        center_id=center.id,
        product_id=product.id,
        production_date=payload.production_date,
        responsible=responsible_actor.full_name,
        responsible_actor_id=responsible_actor.id,
        total_liters=total_liters,
        registered_by_user_id=user.id,
        center=center,
        product=product,
        responsible_actor=responsible_actor,
        registered_by_user=user,
        details=[
            MilkProductionDetail(
                id=uuid.uuid4(),
                animal_reference=detail.animal_reference,
                liters=detail.liters,
            )
            for detail in payload.details
        ],
    )
    session.add(production)
    session.flush()

    event = TraceabilityEvent(
        id=uuid.uuid4(),
        event_type=PRODUCTION_EVENT_TYPE,
        occurred_at=datetime.now(UTC),
        recorded_by_user_id=user.id,
        operational_actor_id=responsible_actor.id,
        center_id=center.id,
        product_id=product.id,
        reference_type=PRODUCTION_REFERENCE_TYPE,
        reference_id=production.id,
        description=f"Producción de leche registrada: {total_liters} L.",
        event_metadata={
            "quantity": float(total_liters),
            "unit": "L",
            "lot_code": lot_code,
        },
    )
    session.add(event)
    session.commit()
    session.refresh(production)
    return production
