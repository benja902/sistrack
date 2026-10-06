export type AiContextType = 'dispatch' | 'production' | 'reception' | 'incident' | 'traceability'

export type AiContext = { context_type: AiContextType; context_id: string }

type AiResponseBase = {
  evidencia: string[]
  advertencias: string[]
  informacion_no_disponible: string[]
  fallback_used: boolean
}

export type AiTraceabilityResponse = AiResponseBase & {
  tipo: 'trazabilidad'
  resumen: string
  estado_actual: string
  observaciones: string[]
}

export type AiDifferenceResponse = AiResponseBase & {
  tipo: 'analisis_diferencia'
  interpretacion: string
  diferencia: string | null
  accion_sugerida: string
}

export type AiQueryResponse = AiResponseBase & {
  tipo: 'consulta_contextual'
  respuesta: string
}

export type AiResponse = AiTraceabilityResponse | AiDifferenceResponse | AiQueryResponse
