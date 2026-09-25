import { apiFetch } from '@/services/http'

import type { Incident } from '../types/incident.types'

export function fetchIncidents(centerCode?: string) {
  const query = centerCode ? `?center_code=${encodeURIComponent(centerCode)}` : ''
  return apiFetch<Incident[]>(`/incidents${query}`)
}

export function fetchIncident(incidentId: string) {
  return apiFetch<Incident>(`/incidents/${incidentId}`)
}

export function closeIncident(incidentId: string, resolution: string) {
  return apiFetch<Incident>(`/incidents/${incidentId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution }),
  })
}
