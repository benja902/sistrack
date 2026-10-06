import uuid

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models import Center
from app.modules.incidents.models import Incident
from app.modules.inventory.models import InventoryMovement
from app.modules.logistics.models import Dispatch, Reception
from app.modules.production.models import MilkProduction
from app.modules.requests.models import GuineaPigRequest

from .models import TraceabilityEvent


def _related_reference_ids(session: Session, search: str) -> set[uuid.UUID]:
    references: set[uuid.UUID] = set()
    production = session.scalar(
        select(MilkProduction).where(func.upper(MilkProduction.lot_code) == search.upper())
    )
    request = session.scalar(
        select(GuineaPigRequest).where(func.upper(GuineaPigRequest.request_code) == search.upper())
    )
    dispatch = session.scalar(
        select(Dispatch).where(func.upper(Dispatch.dispatch_code) == search.upper())
    )
    incident = session.scalar(
        select(Incident).where(func.upper(Incident.incident_code) == search.upper())
    )

    if production is not None:
        references.add(production.id)
        dispatch = session.scalar(
            select(Dispatch).where(Dispatch.milk_production_id == production.id)
        )
    if request is not None:
        references.add(request.id)
        dispatch = session.scalar(
            select(Dispatch).where(Dispatch.guinea_pig_request_id == request.id)
        )
    if incident is not None:
        references.add(incident.id)
        reception = session.get(Reception, incident.reception_id)
        if reception is not None:
            references.add(reception.id)
            dispatch = session.get(Dispatch, reception.dispatch_id)
    if dispatch is not None:
        references.add(dispatch.id)
        if dispatch.milk_production_id is not None:
            references.add(dispatch.milk_production_id)
        if dispatch.guinea_pig_request_id is not None:
            references.add(dispatch.guinea_pig_request_id)
        reception = session.scalar(select(Reception).where(Reception.dispatch_id == dispatch.id))
        if reception is not None:
            references.add(reception.id)
            linked_incident = session.scalar(
                select(Incident).where(Incident.reception_id == reception.id)
            )
            if linked_incident is not None:
                references.add(linked_incident.id)
        references.update(
            session.scalars(
                select(InventoryMovement.id).where(
                    InventoryMovement.reference_type == "dispatch",
                    InventoryMovement.reference_id == dispatch.id,
                )
            ).all()
        )
    return references


def list_traceability_events(
    session: Session,
    center_code: str | None = None,
    search: str | None = None,
    limit: int = 200,
    *,
    references: set[tuple[str, uuid.UUID]] | None = None,
) -> list[TraceabilityEvent]:
    statement = (
        select(TraceabilityEvent)
        .options(
            selectinload(TraceabilityEvent.recorded_by_user),
            selectinload(TraceabilityEvent.operational_actor),
            selectinload(TraceabilityEvent.center),
            selectinload(TraceabilityEvent.product),
        )
        .order_by(TraceabilityEvent.occurred_at.desc(), TraceabilityEvent.recorded_at.desc())
        .limit(limit)
    )
    if center_code:
        statement = statement.where(
            TraceabilityEvent.center.has(func.upper(Center.code) == center_code.upper())
        )
    if references is not None:
        if not references:
            return []
        references = set(references)
        dispatch_ids = {ref for kind, ref in references if kind == "dispatch"}
        if dispatch_ids:
            references.update(
                ("inventory_movement", movement_id)
                for movement_id in session.scalars(
                    select(InventoryMovement.id).where(
                        InventoryMovement.reference_type == "dispatch",
                        InventoryMovement.reference_id.in_(dispatch_ids),
                    )
                ).all()
            )
        statement = statement.where(
            or_(
                *[
                    (TraceabilityEvent.reference_type == kind)
                    & (TraceabilityEvent.reference_id == ref)
                    for kind, ref in references
                ]
            )
        )
    normalized_search = search.strip() if search else None
    if normalized_search:
        pattern = f"%{normalized_search}%"
        related_ids = _related_reference_ids(session, normalized_search)
        conditions = [
            TraceabilityEvent.event_type.ilike(pattern),
            TraceabilityEvent.description.ilike(pattern),
            cast(TraceabilityEvent.reference_id, String).ilike(pattern),
            cast(TraceabilityEvent.event_metadata, String).ilike(pattern),
        ]
        if related_ids:
            conditions.append(TraceabilityEvent.reference_id.in_(related_ids))
        statement = statement.where(or_(*conditions))
    return list(session.scalars(statement).all())


def get_traceability_event(session: Session, event_id: uuid.UUID) -> TraceabilityEvent | None:
    return session.scalar(
        select(TraceabilityEvent)
        .options(selectinload(TraceabilityEvent.center), selectinload(TraceabilityEvent.product))
        .where(TraceabilityEvent.id == event_id)
    )


def get_traceability_dispatch_id(session: Session, event: TraceabilityEvent) -> uuid.UUID | None:
    """Resolve existing reception/request/movement references without fuzzy searches."""
    if event.reference_type == "reception":
        reception = session.get(Reception, event.reference_id)
        return reception.dispatch_id if reception else None
    if event.reference_type == "guinea_pig_request":
        return session.scalar(
            select(Dispatch.id).where(Dispatch.guinea_pig_request_id == event.reference_id)
        )
    if event.reference_type == "inventory_movement":
        movement = session.get(InventoryMovement, event.reference_id)
        if movement and movement.reference_type == "dispatch":
            return movement.reference_id
    return None
