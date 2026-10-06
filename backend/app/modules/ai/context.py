from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.incidents.service import get_incident
from app.modules.logistics.service import get_dispatch, list_dispatches
from app.modules.production.service import get_milk_production
from app.modules.traceability.service import (
    get_traceability_dispatch_id,
    get_traceability_event,
    list_traceability_events,
)

from .schemas import ContextType


def build_context(session: Session, kind: ContextType, record_id: UUID) -> dict:
    """Materialize an explicit allowlist while the sync session is still available."""
    references: set[tuple[str, UUID]] = set()
    facts: list[str] = []
    unknown: list[str] = []
    records: list[dict] = []
    selected_event = None
    dispatches = []
    state = "No disponible"

    if kind == "traceability":
        selected_event = get_traceability_event(session, record_id)
        if selected_event is None:
            raise HTTPException(404, "Evento de trazabilidad no encontrado.")
        mapping = {"dispatch": "dispatch", "milk_production": "production", "incident": "incident"}
        if selected_event.reference_id and selected_event.reference_type in mapping:
            context = build_context(
                session, mapping[selected_event.reference_type], selected_event.reference_id
            )
            context["context_type"] = kind
            return context
        dispatch_id = get_traceability_dispatch_id(session, selected_event)
        if dispatch_id:
            context = build_context(session, "dispatch", dispatch_id)
            context["context_type"] = kind
            return context
        if selected_event.reference_type and selected_event.reference_id:
            references.add((selected_event.reference_type, selected_event.reference_id))
        unknown.append("El contexto disponible se limita a los eventos de esta referencia.")
    elif kind == "production":
        production = get_milk_production(session, record_id)
        if production is None:
            raise HTTPException(404, "Producción no encontrada.")
        records.append(
            {
                "lote": production.lot_code,
                "centro": production.center.name,
                "producto": production.product.name,
                "cantidad_producida": str(production.total_liters),
                "unidad": production.product.unit_of_measure,
                "fecha_produccion": production.production_date.isoformat(),
            }
        )
        facts.extend(
            [
                f"Lote: {production.lot_code}",
                f"Centro: {production.center.name}",
                f"Producto: {production.product.name}",
                f"Cantidad producida: {production.total_liters} "
                f"{production.product.unit_of_measure}",
                f"Fecha de producción: {production.production_date.isoformat()}",
            ]
        )
        references.add(("milk_production", production.id))
        dispatches = list_dispatches(session, production_id=production.id)
        state = "Producción registrada"
    elif kind == "incident":
        incident = get_incident(session, record_id)
        if incident is None:
            raise HTTPException(404, "Incidencia no encontrada.")
        dispatch = get_dispatch(session, incident.reception.dispatch_id)
        dispatches = [dispatch] if dispatch else []
        state = incident.status
    else:
        dispatch = get_dispatch(session, record_id)
        if dispatch is None:
            raise HTTPException(404, "Despacho no encontrado.")
        dispatches = [dispatch]
        state = (
            dispatch.reception.status
            if kind == "reception" and dispatch.reception
            else dispatch.status
        )

    difference: Decimal | None = None
    for dispatch in dispatches:
        reception = dispatch.reception
        incident = reception.incident if reception else None
        data = {
            "despacho": dispatch.dispatch_code,
            "referencia_origen": dispatch.source_code,
            "centro": dispatch.center.name,
            "producto": dispatch.product.name,
            "unidad": dispatch.unit_of_measure,
            "destino": dispatch.destination,
            "estado_despacho": dispatch.status,
            "fecha_creacion": dispatch.created_at.isoformat(),
            "fecha_salida": dispatch.dispatched_at.isoformat() if dispatch.dispatched_at else None,
            "cantidad_despachada": str(
                reception.dispatched_quantity if reception else dispatch.quantity
            ),
            "recepcion": None,
            "incidencia": None,
        }
        references.add(("dispatch", dispatch.id))
        if dispatch.milk_production_id:
            references.add(("milk_production", dispatch.milk_production_id))
        if dispatch.guinea_pig_request_id:
            references.add(("guinea_pig_request", dispatch.guinea_pig_request_id))
        facts.extend(
            [
                f"Despacho: {dispatch.dispatch_code}",
                f"Referencia origen: {dispatch.source_code}",
                f"Centro: {dispatch.center.name}",
                f"Producto: {dispatch.product.name}",
                f"Estado despacho: {dispatch.status}",
                f"Cantidad despachada: {data['cantidad_despachada']} {dispatch.unit_of_measure}",
            ]
        )
        if reception:
            # The domain's historical snapshot is authoritative, even after incident closure.
            difference = reception.received_quantity - reception.dispatched_quantity
            data["recepcion"] = {
                "cantidad_recibida": str(reception.received_quantity),
                "diferencia": str(difference),
                "estado": reception.status,
                "fecha": reception.received_at.isoformat(),
                "observacion_reportada": reception.observation,
            }
            references.add(("reception", reception.id))
            facts.extend(
                [
                    f"Cantidad recibida: {reception.received_quantity} {dispatch.unit_of_measure}",
                    f"Diferencia registrada: {difference} {dispatch.unit_of_measure}",
                    f"Estado recepción: {reception.status}",
                    f"Fecha recepción: {reception.received_at.isoformat()}",
                ]
            )
            if reception.observation:
                facts.append(f"Observación reportada: {reception.observation}")
            if difference != 0:
                unknown.append(
                    "Los registros no permiten determinar automáticamente "
                    "la causa de la diferencia."
                )
        else:
            unknown.append("No hay recepción registrada; no se puede calcular una diferencia.")
        if incident:
            references.add(("incident", incident.id))
            data["incidencia"] = {
                "codigo": incident.incident_code,
                "estado": incident.status,
                "resolucion_reportada": incident.resolution,
                "fecha_creacion": incident.created_at.isoformat(),
                "fecha_cierre": incident.closed_at.isoformat() if incident.closed_at else None,
            }
            facts.append(f"Incidencia: {incident.incident_code}, estado {incident.status}")
            if incident.resolution:
                facts.append(f"Resolución reportada: {incident.resolution}")
        else:
            facts.append("No hay incidencia registrada para este despacho.")
        records.append(data)

    events = list_traceability_events(session, references=references, limit=51)
    if selected_event and all(event.id != selected_event.id for event in events):
        events = [selected_event, *events]
    truncated = len(events) > 50
    events = events[:50]
    event_data = []
    for event in reversed(events):
        description = event.description[:500]
        event_data.append(
            {
                "tipo": event.event_type,
                "fecha": event.occurred_at.isoformat(),
                "descripcion": description,
                "centro": event.center.name,
                "producto": event.product.name if event.product else None,
            }
        )
        facts.append(f"Evento {event.occurred_at.isoformat()}: {description}")
        truncated = truncated or len(event.description) > 500
    if not facts:
        unknown.append("No hay información operativa adicional disponible.")
    warnings = (
        ["El historial fue limitado a 50 eventos o textos de 500 caracteres."] if truncated else []
    )
    return {
        "context_type": kind,
        "estado_actual": state,
        "diferencia": str(difference) if difference is not None else None,
        "registros": records,
        "eventos": event_data,
        "evidencia": list(dict.fromkeys(facts)),
        "informacion_no_disponible": list(dict.fromkeys(unknown)),
        "advertencias": warnings,
    }
