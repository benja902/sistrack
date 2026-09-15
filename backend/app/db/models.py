"""Import all models so Alembic can discover metadata and relationships."""

from app.modules.catalog.models import Center, Product
from app.modules.identity.models import OperationalActor, Role, User
from app.modules.inventory.models import InventoryBalance, InventoryMovement
from app.modules.production.models import MilkProduction, MilkProductionDetail
from app.modules.requests.models import GuineaPigRequest, InventoryReservation
from app.modules.traceability.models import TraceabilityEvent

__all__ = [
    "Center",
    "InventoryBalance",
    "InventoryMovement",
    "InventoryReservation",
    "MilkProduction",
    "MilkProductionDetail",
    "OperationalActor",
    "Product",
    "GuineaPigRequest",
    "Role",
    "TraceabilityEvent",
    "User",
]
