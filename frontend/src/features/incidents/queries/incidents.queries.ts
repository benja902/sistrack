import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { closeIncident, fetchIncident, fetchIncidents } from '../api/incidents.api'

export const incidentQueryKeys = {
  all: ['incidents'] as const,
  list: (center?: string) => ['incidents', 'list', center ?? 'all'] as const,
  detail: (id: string) => ['incidents', 'detail', id] as const,
}

export function useIncidents(centerCode?: string) {
  return useQuery({
    queryKey: incidentQueryKeys.list(centerCode),
    queryFn: () => fetchIncidents(centerCode),
  })
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: incidentQueryKeys.detail(incidentId),
    queryFn: () => fetchIncident(incidentId),
    enabled: Boolean(incidentId),
  })
}

export function useCloseIncident(incidentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (resolution: string) => closeIncident(incidentId, resolution),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incidentQueryKeys.all }),
  })
}
