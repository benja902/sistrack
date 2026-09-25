import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models import Center
from app.modules.identity.models import User
from app.modules.logistics.models import Dispatch, Reception
from app.modules.traceability.models import TraceabilityEvent

from .models import Incident

INCIDENT_REFERENCE_TYPE = "incident"


class IncidentValidationError(ValueError):
    pass


def _incident_options():
    return (
        selectinload(Incident.reception)
        .selectinload(Reception.dispatch)
        .selectinload(Dispatch.center),
        selectinload(Incident.reception)
        .selectinload(Reception.dispatch)
        .selectinload(Dispatch.product),
        selectinload(Incident.reception)
        .selectinload(Reception.dispatch)
        .selectinload(Dispatch.milk_production),
        selectinload(Incident.reception)
        .selectinload(Reception.dispatch)
        .selectinload(Dispatch.guinea_pig_request),
        selectinload(Incident.closed_by_user),
    )


def _next_incident_code(session: Session, occurred_at: datetime) -> str:
    prefix = f"INC-{occurred_at:%Y%m%d}-"
    latest = session.scalar(
        select(Incident.incident_code)
        .where(Incident.incident_code.like(f"{prefix}%"))
        .order_by(Incident.incident_code.desc())
        .limit(1)
    )
    sequence = int(latest.rsplit("-", 1)[1]) + 1 if latest else 1
    return f"{prefix}{sequence:03d}"


def create_incident_for_reception(
    session: Session,
    reception: Reception,
    dispatch: Dispatch,
    recorded_by_user_id: uuid.UUID,
) -> Incident | None:
    if reception.difference == 0:
        return None
    incident = Incident(
        id=uuid.uuid4(),
        incident_code=_next_incident_code(session, reception.received_at),
        reception_id=reception.id,
        status="OPEN",
        reception=reception,
    )
    session.add(incident)
    session.flush()
    session.add(
        TraceabilityEvent(
            id=uuid.uuid4(),
            event_type="incident_created",
            occurred_at=datetime.now(UTC),
            recorded_by_user_id=recorded_by_user_id,
            center_id=dispatch.center_id,
            product_id=dispatch.product_id,
            reference_type=INCIDENT_REFERENCE_TYPE,
            reference_id=incident.id,
            description=f"Incidencia {incident.incident_code} creada por diferencia en recepción.",
            event_metadata={
                "incident_code": incident.incident_code,
                "reception_id": str(reception.id),
                "dispatch_id": str(dispatch.id),
                "difference": float(reception.difference),
                "status": "OPEN",
            },
        )
    )
    return incident


def list_incidents(session: Session, center_code: str | None = None) -> list[Incident]:
    statement = (
        select(Incident)
        .join(Incident.reception)
        .join(Reception.dispatch)
        .options(*_incident_options())
        .order_by(Incident.created_at.desc())
    )
    if center_code:
        statement = statement.where(
            Dispatch.center.has(func.upper(Center.code) == center_code.upper())
        )
    return list(session.scalars(statement).all())


def get_incident(session: Session, incident_id: uuid.UUID) -> Incident | None:
    return session.scalar(
        select(Incident).options(*_incident_options()).where(Incident.id == incident_id)
    )


def close_incident(
    session: Session,
    incident_id: uuid.UUID,
    resolution: str,
    closed_by_user_id: uuid.UUID,
) -> Incident:
    user = session.scalar(
        select(User).where(User.id == closed_by_user_id, User.is_active.is_(True))
    )
    if user is None:
        raise IncidentValidationError("El usuario de cierre no existe o está inactivo.")
    incident = session.scalar(
        select(Incident)
        .options(*_incident_options())
        .where(Incident.id == incident_id)
        .with_for_update()
    )
    if incident is None:
        raise IncidentValidationError("Incidencia no encontrada.")
    if incident.status != "OPEN":
        raise IncidentValidationError("La incidencia ya está cerrada.")

    original_difference = incident.reception.difference
    now = datetime.now(UTC)
    incident.status = "CLOSED"
    incident.resolution = resolution
    incident.closed_at = now
    incident.closed_by_user_id = user.id
    incident.closed_by_user = user
    dispatch = incident.reception.dispatch
    session.add(
        TraceabilityEvent(
            id=uuid.uuid4(),
            event_type="incident_closed",
            occurred_at=now,
            recorded_by_user_id=user.id,
            center_id=dispatch.center_id,
            product_id=dispatch.product_id,
            reference_type=INCIDENT_REFERENCE_TYPE,
            reference_id=incident.id,
            description=f"Incidencia {incident.incident_code} cerrada.",
            event_metadata={
                "incident_code": incident.incident_code,
                "resolution": resolution,
                "difference": float(original_difference),
                "status": "CLOSED",
            },
        )
    )
    session.commit()
    return get_incident(session, incident.id) or incident
