import { apiFetch } from '@/services/http'

import type { AiContext, AiDifferenceResponse, AiQueryResponse, AiTraceabilityResponse } from '../types/ai.types'

function post<T>(path: string, body: object, signal?: AbortSignal) {
  return apiFetch<T>(`/ai/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export function explainTraceability(context: AiContext, signal?: AbortSignal) {
  return post<AiTraceabilityResponse>('traceability/explain', context, signal)
}

export function analyzeDifferences(dispatchId: string, signal?: AbortSignal) {
  return post<AiDifferenceResponse>('differences/analyze', { dispatch_id: dispatchId }, signal)
}

export function queryAiContext(context: AiContext, question: string, signal?: AbortSignal) {
  return post<AiQueryResponse>('context/query', { ...context, question }, signal)
}
