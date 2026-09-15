import { apiFetch } from '@/services/http'

import type { DispatchCreate, LogisticsDispatch, ReceptionCreate } from '../types/logistics.types'

function centerQuery(centerCode?: string) {
  return centerCode ? `?center_code=${encodeURIComponent(centerCode)}` : ''
}

export function fetchDispatches(centerCode?: string) {
  return apiFetch<LogisticsDispatch[]>(`/logistics/dispatches${centerQuery(centerCode)}`)
}

export function fetchDispatch(dispatchId: string) {
  return apiFetch<LogisticsDispatch>(`/logistics/dispatches/${dispatchId}`)
}

export function createDispatch(payload: DispatchCreate) {
  return apiFetch<LogisticsDispatch>('/logistics/dispatches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function departDispatch(dispatchId: string) {
  return apiFetch<LogisticsDispatch>(`/logistics/dispatches/${dispatchId}/depart`, {
    method: 'POST',
  })
}

export function fetchReceptions(centerCode?: string) {
  return apiFetch<LogisticsDispatch[]>(`/logistics/receptions${centerQuery(centerCode)}`)
}

export function fetchReception(dispatchId: string) {
  return apiFetch<LogisticsDispatch>(`/logistics/receptions/${dispatchId}`)
}

export function registerReception(dispatchId: string, payload: ReceptionCreate) {
  return apiFetch<LogisticsDispatch>(`/logistics/receptions/${dispatchId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
