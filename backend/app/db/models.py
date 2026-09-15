"""Import all models so Alembic can discover metadata and relationships."""

from app.modules.catalog.models import Center, Product
from app.modules.identity.models import OperationalActor, Role, User
from app.modules.production.models import MilkProduction, MilkProductionDetail
from app.modules.traceability.models import TraceabilityEvent

__all__ = [
    "Center",
    "MilkProduction",
    "MilkProductionDetail",
    "OperationalActor",
    "Product",
    "Role",
    "TraceabilityEvent",
    "User",
]
