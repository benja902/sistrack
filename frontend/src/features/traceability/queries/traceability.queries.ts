import { useQuery } from '@tanstack/react-query'

import { fetchTraceabilityEvents } from '../api/traceability.api'

export function useTraceabilityEvents(centerCode?: string, search?: string) {
  return useQuery({
    queryKey: ['traceability', centerCode ?? 'all', search ?? ''],
    queryFn: () => fetchTraceabilityEvents(centerCode, search),
    enabled: Boolean(search),
  })
}
