# Módulo IA: primera versión funcional

## Arquitectura

React → JWT → FastAPI → services existentes → PostgreSQL/Supabase → selección
de contexto permitido → Gemini → JSON estructurado → validación Pydantic → React.

Esta integración utiliza **In-Context Learning**: el backend incluye datos reales
y ejemplos breves en la solicitud. No entrena un modelo. No es RAG, no usa
embeddings ni pgvector y no implementa function calling, tools, agentes o SQL
generado. Gemini no accede directamente a PostgreSQL: FastAPI determina qué
servicios consultar mediante `context_type` y `context_id`.

## Configuración

Instalar dependencias backend actualizadas: `pip install -e ".[dev]"` desde
`backend`, o `pip install -r requirements.txt` para el despliegue desde la raíz.
Se utiliza el SDK oficial `google-genai>=1.75,<2.0` (validado con 1.75.0).

El cliente envía `response_json_schema=schema.model_json_schema()` para preservar
los nombres de los campos JSON Schema. No convierte los modelos a `response_schema`
legacy: esa conversión enviaba `additional_properties`, rechazado por la API con 400.

Variables exclusivas del backend:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_SECONDS=5
```

Configurar mediante Settings en `backend/.env` o variables del proceso. Una key
ausente activa fallback; no impide iniciar la aplicación. No se configura
`temperature`, `top_p` ni `top_k`. Se usa un cliente compartido por aplicación,
la API asíncrona del SDK, structured output y un timeout total sin reintentos.
El cliente se cierra en el lifespan de FastAPI.

La API key no llega al frontend ni se devuelve en errores/logs. Se almacena como
`SecretStr`; no hay variables `VITE_` para Gemini. Se eliminan secretos conocidos
y JWT de los textos enviados y de las respuestas. No se registran excepciones
completas del proveedor ni de la base de datos.

## Endpoints y contextos

Todas las operaciones requieren JWT y rol `ADMINISTRADOR`; reutilizan
`get_current_user` y `require_roles` existentes.

| POST | Cuerpo |
| --- | --- |
| `/api/v1/ai/traceability/explain` | `context_type`, `context_id` |
| `/api/v1/ai/differences/analyze` | `dispatch_id` |
| `/api/v1/ai/context/query` | `context_type`, `context_id`, `question` |

Los IDs deben ser UUID. Los tipos admitidos son `dispatch`, `production`,
`reception`, `incident` y `traceability`. Para `reception`, el ID es el UUID del
**despacho**, igual que en logística. Para `traceability`, es el UUID del
**evento** seleccionado; se amplía mediante referencias soportadas al proceso
relacionado. Una referencia sin mapping permite explicar sus eventos disponibles.
Los lotes se consultan mediante `production`; no existe consulta global por producto.

`question` se recorta solo en sus extremos. Su longitud final debe ser de 1 a
1000 caracteres; fuera de ese rango se devuelve 422 sin truncarla. También se
rechazan campos adicionales y contextos inválidos. Sin autenticación se devuelve
401, con otro rol 403 y para registros inexistentes 404. Estos errores no se
convierten en fallback.

## Requerimientos y schemas

- **RF-IA-01:** explica el registro y sus eventos relacionados, usando
  `TraceabilityResponse`: `tipo=trazabilidad`, `resumen`, `estado_actual`,
  `observaciones`.
- **RF-IA-02:** analiza el despacho y su recepción/incidencia, usando
  `DifferenceResponse`: `tipo=analisis_diferencia`, `interpretacion`,
  `diferencia`, `accion_sugerida`.
- **RF-IA-03:** responde preguntas sobre un contexto explícito, usando
  `QueryResponse`: `tipo=consulta_contextual`, `respuesta`.

Todos incluyen `evidencia`, `advertencias`, `informacion_no_disponible` y
`fallback_used`. La evidencia es texto de hechos preparados por el backend.
El modelo debe copiar evidencia existente; se validan referencias, estado y
diferencia. FastAPI controla `fallback_used` y añade las limitaciones del contexto.

Se conserva la convención del dominio: **recibido − despachado**, con `Decimal`.
Negativo significa faltante; positivo, excedente; cero, coincidencia. La
recepción histórica es la fuente del cálculo, incluso después de cerrar una
incidencia. Sin recepción, `diferencia=null`. Pydantic serializa Decimal como
string: `"-5"` conserva el signo mientras la UI expresa “faltante de 5”.

```json
{
  "tipo": "analisis_diferencia",
  "interpretacion": "Se registra un faltante de 5.",
  "diferencia": "-5",
  "accion_sugerida": "Revisar la recepción y las incidencias asociadas.",
  "evidencia": ["Cantidad despachada: 120 L", "Cantidad recibida: 115 L"],
  "advertencias": ["El análisis de IA no estuvo disponible."],
  "informacion_no_disponible": [
    "Los registros no permiten determinar automáticamente la causa de la diferencia."
  ],
  "fallback_used": true
}
```

## Contexto y fallback

Se reutilizan `get_dispatch`, `list_dispatches`, `get_milk_production`,
`get_incident` y `list_traceability_events`. Los filtros de historial usan
referencias exactas; incluyen movimientos de inventario del despacho. No se
envían dumps ORM, metadata arbitraria, hashes, emails o identidades innecesarias.
Las consultas síncronas se ejecutan en dependencias fuera del event loop y
entregan contexto materializado al servicio asíncrono.

El historial se limita a 50 eventos, con descripciones de hasta 500 caracteres;
se advierte cuando fue limitado. Las observaciones y resoluciones son información
reportada, no una atribución automática de causa o responsabilidad.

Ante timeout, red/quota, proveedor no disponible, key ausente, JSON vacío/inválido,
schema incompatible o contradicciones detectadas, se construye una respuesta
determinista con los datos reales. Un fallo de Gemini no produce por sí solo
un 500. El fallback responde estado, diferencias e incidencias; para preguntas
generales ofrece un resumen y las limitaciones disponibles. Las solicitudes
claramente ajenas al dominio o de credenciales/SQL se rechazan sin llamar al modelo.

El System Prompt y ejemplos exigen distinguir hechos e información desconocida.
Hay comprobaciones complementarias de causas comunes no respaldadas. Estas
comprobaciones no garantizan detectar cualquier alucinación en texto libre;
no se deben interpretar recomendaciones como hechos verificados. La generación
del proveedor no es completamente determinista; el fallback sí lo es.

## Auditoría y UI

La migración `20261002_0009` crea `ai_logs` después de `20260915_0008`.
**Se preparó sin aplicarla a Supabase ni al entorno real.** Su aplicación es un
paso posterior de despliegue administrado.

Campos: `id`, `user_id`, `rf_code`, `context_type`, `context_reference`, `model`,
`status`, `fallback_used`, `latency_ms`, `input_tokens`, `output_tokens`, `created_at`.
Los tokens son null cuando no están disponibles. Las respuestas generadas y
rechazos controlados registran `success`; el fallback registra `fallback`.
El schema también admite `error`, reservado para errores que no produzcan respuesta.
No se almacenan preguntas, prompts, contextos completos, respuestas ni secretos.

Se usa una sesión/transacción independiente y espera acotada de auditoría.
Una tabla ausente o fallo del log solo emite un aviso sanitizado; nunca invalida
la respuesta. Si la espera se agota, la escritura ya iniciada puede finalizar
en su hilo independientemente de la respuesta.

`AiAssistantPanel` se integra en trazabilidad y detalles de producción, despacho,
recepción e incidencia. Muestra contexto, loading, respuesta, evidencia,
advertencias e indicador de respaldo; conserva el diseño actual. Solo es visible
para administradores. No llama a Gemini automáticamente y aborta solicitudes
pendientes al cambiar contexto o actualizar el registro.

## Validación y límites

Los tests mockean el cliente o el transporte HTTP del SDK: **no llaman a Gemini**.
Cubren permisos, errores, validación, diferencias firmadas, ausencia de recepción,
auditoría ausente y comportamiento del panel. Las pruebas PostgreSQL existentes
siguen siendo optativas mediante `RUN_DATABASE_TESTS=1` sobre una base de pruebas.

Para una futura versión quedan RAG, embeddings, pgvector y function calling;
no se agregaron dependencias ni infraestructura para esas capacidades.

## Archivos de esta implementación

Nuevos:

- `backend/app/modules/ai/{__init__,client,context,fallback,prompts,schemas,service,audit,models}.py`.
- `backend/app/api/v1/routes/ai.py`.
- `backend/alembic/versions/20261002_0009_ai_logs.py`.
- `backend/tests/test_ai.py` y `backend/tests/test_ai_sdk.py`.
- `frontend/src/features/ai/types/ai.types.ts`.
- `frontend/src/features/ai/api/ai.api.ts`.
- `frontend/src/features/ai/queries/ai.queries.ts`.
- `frontend/src/features/ai/components/AiAssistantPanel.tsx`.
- `frontend/src/features/ai/AiAssistantPanel.test.tsx`.
- `AI_MODULE.md`.

Modificados:

- `.env.example`, `backend/.env.example`, `backend/pyproject.toml`, `requirements.txt`.
- `backend/app/core/config.py`, `backend/app/main.py`, `backend/app/db/models.py`.
- `backend/app/api/v1/router.py`.
- `backend/app/modules/logistics/service.py`.
- `backend/app/modules/traceability/service.py` (archivo local preexistente sin seguimiento).
- Detalles frontend: `DispatchDetailPage`, `ReceptionDetailPage`, `IncidentDetailPage`,
  `ProductionDetailPage`, y `TraceabilityPage` (también preexistente sin seguimiento).
- `README.md`.

Los cambios locales previos de trazabilidad, rutas y dependencias frontend se
conservaron. No se modificaron los entornos reales ni se hicieron commits.
La documentación está en la raíz porque `docs/` está excluido por el `.gitignore`
actual; así queda disponible para incluirla en una revisión posterior.

## Resultados de validación

- Backend completo: `python -m pytest -q -p no:cacheprovider` → **96 passed,
  5 skipped**. Los skips corresponden a pruebas PostgreSQL optativas.
- IA y módulos relacionados: **70 passed** en la última ejecución dirigida.
- Frontend completo: `npm run test` → **26 passed**, incluyendo 8 tests del panel.
- Ruff: todos los checks pasan; formatter confirma 19 archivos formateados.
- ESLint: `npm run lint` → correcto.
- TypeScript y build: `npm run build` → correcto.
- Migración: SQL offline de `20260915_0008:20261002_0009` generado correctamente
  con URL ficticia; contiene `CREATE TABLE ai_logs`, sin conexión a PostgreSQL.
- `git diff --check` → correcto.

Avisos no bloqueantes: deprecaciones de Starlette/httpx/AnyIO en los tests y
bundle frontend mayor de 500 kB. No se realizó validación contra Gemini real ni
contra Supabase real; el SDK se probó con transporte HTTP simulado. La tabla de
auditoría requiere su migración en un despliegue posterior, pero su ausencia no
afecta las respuestas funcionales.

## Diagnóstico posterior de Gemini

Se corrigió el HTTP 400 causado por la conversión del schema legacy. Una
comprobación manual con datos ficticios contra Gemini confirmó JSON válido y
validación factual correcta; no consultó Supabase. Esa comprobación tardó unos
5,2 segundos. Los tests siguen utilizando mocks y transporte simulado: la última
ejecución dirigida de `test_ai.py` y `test_ai_sdk.py` obtuvo **60 passed**.

Si persiste el fallback por timeout, se puede configurar
`GEMINI_TIMEOUT_SECONDS=15` en `backend/.env` y reiniciar FastAPI. Este diagnóstico
no modificó el entorno real, el modelo ni los parámetros de sampling.

La terminal ahora muestra `ai_provider_fallback reason=<código seguro>` para
distinguir `timeout`, `provider_http_400`, `invalid_response_schema`, contradicciones
y otros fallos sin imprimir claves, mensajes completos del proveedor o contextos.
`ai_audit_unavailable` corresponde únicamente a la auditoría y no explica por
sí solo el fallo de Gemini. No se aplicó la migración de auditoría.

### Corrección de RF-IA-02 y RF-IA-03

Las comprobaciones de ejemplo reprodujeron respuestas con `tipo` incompatible
con Pydantic: Gemini contestaba, pero la validación activaba fallback. El schema
enviado ahora convierte los literales de un solo valor de `const` a `enum`, hace
obligatorio `tipo` y la solicitud indica explícitamente `operacion`.
La validación Pydantic local conserva sus restricciones originales; tipos
incorrectos continúan activando fallback.

El prompt solicita respuestas breves y entre uno y tres hechos copiados como
evidencia. El backend añade la evidencia completa después de validar, evitando
que el modelo tenga que reproducir todo el historial. No se cambió el modelo,
el timeout configurado, los parámetros de sampling ni la fórmula de diferencias.

Tres comprobaciones manuales con ejemplos, sin consultar Supabase, obtuvieron
respuestas válidas: RF-IA-02 con incidencia abierta (6,8 s), RF-IA-03 sobre
cantidades (4,2 s) y RF-IA-03 sobre incidencia cerrada (3,8 s). Son tiempos
observados, no una garantía de latencia. Los logs de fallback incluyen un código
seguro y `latency_ms` para distinguir futuros errores sin imprimir respuestas
del proveedor, datos de contexto o secretos.

## Presentación del asistente para usuarios

El panel compartido de los tres RF presenta los contextos y estados en español
en trazabilidad, producción, despacho, recepción e incidencia. Por ejemplo,
`IN_TRANSIT` se muestra como «En transporte», `WITH_DIFFERENCE` como «Con
diferencia» y `OPEN`/`CLOSED` como «Abierta»/«Cerrada». La misma presentación se
aplica a respuestas de Gemini y de respaldo, observaciones y evidencia.

Las cantidades pierden únicamente los ceros decimales innecesarios: `15.500 L`
se muestra como «15.5 L» y `4.000 ejemplares` como «4 ejemplares», sin redondear.
La evidencia de una diferencia `-0.500 L` se presenta como «faltante de 0.5 L»;
una diferencia positiva como excedente y cero como ausencia de diferencia.
Los códigos de lote, despacho e incidencia permanecen visibles para identificar
los registros.

Las fechas se presentan como día/mes/año y los instantes como día/mes/año y
hora, en `America/Lima`, con una indicación del horario de Perú. Las fechas de
producción que no tienen hora conservan su día original. Estos cambios son
exclusivamente de presentación: no modifican la API, Gemini, el cálculo de
diferencias ni los valores almacenados. No requieren migraciones.

Validación de esta presentación: **32 tests del asistente pasan**, incluyendo los
tres RF con y sin fallback y los cinco contextos; ESLint, TypeScript y build
correctos. El build mantiene el aviso preexistente de tamaño del bundle.
