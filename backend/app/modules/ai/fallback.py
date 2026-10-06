import re
import unicodedata
from decimal import Decimal

from .schemas import DifferenceResponse, QueryResponse, TraceabilityResponse

OUT_OF_DOMAIN = (
    "Solo estoy autorizado para responder consultas relacionadas con la trazabilidad "
    "y las operaciones registradas en el sistema."
)


def normalized(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c)
    )


def forbidden_question(question: str) -> bool:
    return bool(
        re.search(
            r"\b(poema|poesia|chiste|receta|horoscopo|password|contrasena|credenciales|jwt|token|sql)\b"
            r"|capital de|presidente de|pronostico del clima|escribe.*(cuento|cancion|codigo)"
            r"|api[ _-]?key|database_url|jwt_secret|ignora.*instrucciones|revela.*prompt",
            normalized(question),
        )
    )


def difference_text(value: str | None) -> str:
    if value is None:
        return "No hay recepción registrada; no se puede calcular una diferencia."
    amount = Decimal(value)
    magnitude = format(abs(amount).normalize(), "f")
    if amount < 0:
        return f"Se registra un faltante de {magnitude}."
    if amount > 0:
        return f"Se registra un excedente de {magnitude}."
    return "La cantidad recibida coincide con la despachada."


def traceability_state(context: dict) -> str:
    """RF-IA-01: prefer the downstream entities over the entry record's state."""
    candidates = [(0, context["estado_actual"])]
    for record in context.get("registros", []):
        dispatch_state = {
            "PENDING": "Despacho pendiente de salida",
            "IN_TRANSIT": "Despacho en tránsito",
            "COMPLETED": "Despacho completado",
        }.get(record.get("estado_despacho"))
        if dispatch_state:
            candidates.append((1, dispatch_state))
        reception = record.get("recepcion")
        reception_state = None
        if reception:
            reception_state = {
                "WITH_DIFFERENCE": "Recepción registrada con diferencia",
                "CONFORMING": "Recepción registrada sin diferencias",
            }.get(reception["estado"], "Recepción registrada")
            candidates.append((2, reception_state))
        incident = record.get("incidencia")
        if incident:
            incident_state = {"OPEN": "Incidencia abierta", "CLOSED": "Incidencia cerrada"}.get(
                incident["estado"]
            )
            if incident_state:
                final_state = (
                    f"{reception_state}; {incident_state.lower()}"
                    if reception_state
                    else incident_state
                )
                candidates.append((3, final_state))
    return max(candidates, key=lambda candidate: candidate[0])[1]


def fallback_response(context: dict, schema: type, question: str = "", *, unavailable: bool = True):
    common = {
        "evidencia": context["evidencia"],
        "advertencias": [
            *context["advertencias"],
            *(["El análisis de IA no estuvo disponible."] if unavailable else []),
        ],
        "informacion_no_disponible": context["informacion_no_disponible"],
        "fallback_used": unavailable,
    }
    summary = f"Estado actual: {context['estado_actual']}. " + difference_text(
        context["diferencia"]
    )
    if schema is TraceabilityResponse:
        state = traceability_state(context)
        return TraceabilityResponse(
            **common,
            resumen=f"Estado actual: {state}. " + difference_text(context["diferencia"]),
            estado_actual=state,
            observaciones=context["evidencia"][:10],
        )
    if schema is DifferenceResponse:
        return DifferenceResponse(
            **common,
            interpretacion=difference_text(context["diferencia"]),
            diferencia=context["diferencia"],
            accion_sugerida="Revisar la recepción y las incidencias asociadas.",
        )
    if forbidden_question(question):
        return QueryResponse(
            respuesta=OUT_OF_DOMAIN,
            evidencia=[],
            advertencias=["Consulta fuera del dominio autorizado."],
            informacion_no_disponible=[],
            fallback_used=False,
        )
    text = normalized(question)
    if "incidencia" in text:
        answer = (
            " ".join(f for f in context["evidencia"] if "incidencia" in f.lower())
            or "No hay información de incidencias disponible."
        )
    elif any(
        word in text for word in ("diferencia", "coincide", "faltante", "excedente", "cantidad")
    ):
        answer = difference_text(context["diferencia"])
    elif "estado" in text:
        answer = f"Estado actual: {context['estado_actual']}."
    else:
        answer = summary
    return QueryResponse(**common, respuesta=answer)
