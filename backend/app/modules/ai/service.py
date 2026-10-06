import asyncio
import json
import logging
import re
from decimal import Decimal
from time import perf_counter
from uuid import UUID

from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from .audit import write_ai_log
from .client import GeminiClient
from .fallback import OUT_OF_DOMAIN, fallback_response, forbidden_question, normalized
from .schemas import DifferenceResponse, QueryResponse, TraceabilityResponse

logger = logging.getLogger(__name__)


def fallback_reason(error: Exception) -> str:
    """Expose only fixed diagnostic codes, never provider messages or credentials."""
    if isinstance(error, TimeoutError):
        return "timeout"
    if isinstance(error, ValidationError):
        return "invalid_response_schema"
    if isinstance(error, ModuleNotFoundError):
        return "sdk_missing"
    code = getattr(error, "code", None)
    if isinstance(code, int):
        return f"provider_http_{code}"
    safe_codes = {
        "ai_not_configured",
        "unsupported_evidence",
        "missing_evidence",
        "contradictory_difference",
        "contradictory_state",
        "unsupported_cause",
        "sensitive_response",
    }
    reason = str(error)
    return reason if reason in safe_codes else "provider_error"


def validate_facts(response, context: dict) -> None:
    if isinstance(response, QueryResponse) and response.respuesta == OUT_OF_DOMAIN:
        return
    if any(item not in context["evidencia"] for item in response.evidencia):
        raise ValueError("unsupported_evidence")
    if not response.evidencia:
        raise ValueError("missing_evidence")
    if isinstance(response, DifferenceResponse):
        expected = Decimal(context["diferencia"]) if context["diferencia"] is not None else None
        if response.diferencia != expected:
            raise ValueError("contradictory_difference")
    if (
        isinstance(response, TraceabilityResponse)
        and response.estado_actual != context["estado_actual"]
    ):
        raise ValueError("contradictory_state")
    # Reject common unsupported causal assertions. Recorded observations remain reportable.
    narrative = normalized(
        " ".join(
            str(value)
            for key, value in response.model_dump().items()
            if key not in {"evidencia", "advertencias", "informacion_no_disponible"}
        )
    )
    recorded_texts = [
        normalized(item.split(": ", 1)[1])
        for item in context["evidencia"]
        if item.startswith(("Observación reportada:", "Resolución reportada:", "Evento "))
    ]
    for cause in ("derram", "robo", "evapor", "se perdieron", "se perdio", "perdida", "rotura"):
        if cause in narrative and not any(
            cause in text and text in narrative for text in recorded_texts
        ):
            raise ValueError("unsupported_cause")


def redact_payload(text: str, client: GeminiClient) -> str:
    for secret in (
        client.settings.gemini_api_key,
        client.settings.jwt_secret,
        client.settings.database_url,
    ):
        value = secret.get_secret_value() if hasattr(secret, "get_secret_value") else secret
        if value:
            text = text.replace(value, "[REDACTADO]")
    return re.sub(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "[REDACTADO]", text)


async def execute_ai(
    client: GeminiClient,
    context: dict,
    schema: type,
    user_id: UUID,
    context_type: str,
    context_id: UUID,
    rf_code: str,
    question: str = "",
):
    start = perf_counter()
    input_tokens = output_tokens = None
    if question and forbidden_question(question):
        response = fallback_response(context, schema, question, unavailable=False)
    else:
        try:
            payload = redact_payload(
                json.dumps(
                    {
                        "operacion": schema.model_fields["tipo"].default,
                        "contexto": context,
                        "pregunta": question,
                    },
                    ensure_ascii=False,
                ),
                client,
            )
            async with asyncio.timeout(client.settings.gemini_timeout_seconds):
                raw, input_tokens, output_tokens = await client.generate(payload, schema)
            response = schema.model_validate_json(raw)
            if redact_payload(raw, client) != raw:
                raise ValueError("sensitive_response")
            validate_facts(response, context)
            response.fallback_used = False
            response.evidencia = (
                []
                if isinstance(response, QueryResponse) and response.respuesta == OUT_OF_DOMAIN
                else context["evidencia"]
            )
            response.informacion_no_disponible = list(
                dict.fromkeys(
                    [
                        *context["informacion_no_disponible"],
                        *response.informacion_no_disponible,
                    ]
                )
            )
            response.advertencias = list(
                dict.fromkeys(
                    [
                        *context["advertencias"],
                        *response.advertencias,
                    ]
                )
            )
            response = schema.model_validate(response.model_dump())
        except Exception as error:
            logger.warning(
                "ai_provider_fallback reason=%s latency_ms=%s",
                fallback_reason(error),
                int((perf_counter() - start) * 1000),
            )
            response = fallback_response(context, schema, question)
    # Guard fallback text too, including operational free text that could contain secrets.
    response = schema.model_validate_json(redact_payload(response.model_dump_json(), client))
    fields = {
        "user_id": user_id,
        "rf_code": rf_code,
        "context_type": context_type,
        "context_reference": context_id,
        "model": client.settings.gemini_model,
        "status": "fallback" if response.fallback_used else "success",
        "fallback_used": response.fallback_used,
        "latency_ms": int((perf_counter() - start) * 1000),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
    try:
        async with asyncio.timeout(0.5):
            await run_in_threadpool(write_ai_log, fields)
    except Exception:
        logger.warning("ai_audit_unavailable")
    return response
