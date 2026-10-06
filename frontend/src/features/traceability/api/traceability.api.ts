import { apiFetch } from '@/services/http'

import type { TraceabilityEvent } from '../types/traceability.types'

export function fetchTraceabilityEvents(centerCode?: string, search?: string) {
  const params = new URLSearchParams()
  if (centerCode) params.set('center_code', centerCode)
  if (search) params.set('search', search)
  const query = params.size ? `?${params.toString()}` : ''
  return apiFetch<TraceabilityEvent[]>(`/traceability${query}`)
}
