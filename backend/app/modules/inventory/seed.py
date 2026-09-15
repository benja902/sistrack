import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.authentication.service import ADMIN_NAME, ADMIN_ROLE_CODE
from app.modules.catalog.models import Center
from app.modules.identity.models import Role, User

from .models import InventoryBalance, InventoryMovement
from .schemas import InventoryMovementCreate
from .service import create_inventory_movement


class InventorySeedError(RuntimeError):
    pass


BALANCE_SEEDS = (
    ("11000000-0000-0000-0000-000000000001", "KOTOSH", "Adultos / reproductores H", 230, 20),
    ("11000000-0000-0000-0000-000000000002", "KOTOSH", "Adultos / reproductores M", 184, 10),
    ("11000000-0000-0000-0000-000000000003", "KOTOSH", "Lactantes", 141, 0),
    ("11000000-0000-0000-0000-000000000004", "KOTOSH", "Destete H", 103, 15),
    ("11000000-0000-0000-0000-000000000005", "KOTOSH", "Destete M", 85, 15),
    ("11000000-0000-0000-0000-000000000006", "KOTOSH", "Juvenil H", 136, 30),
    ("11000000-0000-0000-0000-000000000007", "KOTOSH", "Juvenil M", 122, 30),
    ("11000000-0000-0000-0000-000000000101", "CANCHAN", "Adultos / reproductores H", 164, 12),
    ("11000000-0000-0000-0000-000000000102", "CANCHAN", "Adultos / reproductores M", 142, 8),
    ("11000000-0000-0000-0000-000000000103", "CANCHAN", "Lactantes", 108, 0),
    ("11000000-0000-0000-0000-000000000104", "CANCHAN", "Destete H", 72, 6),
    ("11000000-0000-0000-0000-000000000105", "CANCHAN", "Destete M", 68, 5),
    ("11000000-0000-0000-0000-000000000106", "CANCHAN", "Juvenil H", 104, 14),
    ("11000000-0000-0000-0000-000000000107", "CANCHAN", "Juvenil M", 98, 10),
)

MOVEMENT_SEEDS = (
    (
        "12000000-0000-0000-0000-000000000001",
        "KOTOSH",
        "Juvenil H",
        "SALE",
        -6,
        "Salida física por venta de cuyes.",
        "2026-09-13T10:20:00-05:00",
    ),
    (
        "12000000-0000-0000-0000-000000000002",
        "KOTOSH",
        "Lactantes",
        "MORTALITY",
        -1,
        "Mortalidad registrada en el inventario de cuyes.",
        "2026-09-13T09:10:00-05:00",
    ),
    (
        "12000000-0000-0000-0000-000000000003",
        "KOTOSH",
        "Adultos / reproductores M",
        "SALE",
        -4,
        "Salida física por venta de cuyes.",
        "2026-09-12T15:40:00-05:00",
    ),
    (
        "12000000-0000-0000-0000-000000000004",
        "KOTOSH",
        "Juvenil M",
        "MORTALITY",
        -2,
        "Mortalidad registrada en el inventario de cuyes.",
        "2026-09-11T08:25:00-05:00",
    ),
    (
        "12000000-0000-0000-0000-000000000005",
        "KOTOSH",
        "Destete H",
        "SALE",
        -8,
        "Salida física por venta de cuyes.",
        "2026-09-10T16:15:00-05:00",
    ),
)


def find_inventory_seed_user(session: Session, configured_email: str | None) -> User | None:
    statement = select(User).join(User.role).where(
        User.full_name == ADMIN_NAME,
        User.is_active.is_(True),
        Role.code == ADMIN_ROLE_CODE,
    )
    if configured_email:
        statement = statement.where(func.lower(User.email) == configured_email.strip().lower())
    return session.scalar(statement.order_by(User.created_at))


def seed_inventory(session: Session, registered_by_user: User) -> None:
    centers = {
        center.code: center
        for center in session.scalars(
            select(Center).where(Center.code.in_(("KOTOSH", "CANCHAN")))
        ).all()
    }
    if set(centers) != {"KOTOSH", "CANCHAN"}:
        raise InventorySeedError("No existen los centros Kotosh y Canchán requeridos.")

    for balance_id, center_code, category, physical, reserved in BALANCE_SEEDS:
        identifier = uuid.UUID(balance_id)
        if session.get(InventoryBalance, identifier) is None:
            session.add(
                InventoryBalance(
                    id=identifier,
                    center_id=centers[center_code].id,
                    category=category,
                    physical_quantity=physical,
                    reserved_quantity=reserved,
                )
            )
    session.commit()

    for (
        movement_id,
        center_code,
        category,
        movement_type,
        quantity,
        description,
        occurred_at,
    ) in MOVEMENT_SEEDS:
        identifier = uuid.UUID(movement_id)
        if session.get(InventoryMovement, identifier) is not None:
            continue
        create_inventory_movement(
            session,
            InventoryMovementCreate(
                center_id=centers[center_code].id,
                category=category,
                movement_type=movement_type,
                quantity=quantity,
                description=description,
                occurred_at=datetime.fromisoformat(occurred_at),
            ),
            registered_by_user.id,
            movement_id=identifier,
        )
