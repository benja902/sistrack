import { apiFetch } from '@/services/http'

import type { GuineaPigRequest, GuineaPigRequestCreate, RequestStatus } from '../types/request.types'

function listQuery(centerCode?: string, status?: RequestStatus) {
  const params = new URLSearchParams()
  if (centerCode) params.set('center_code', centerCode)
  if (status) params.set('request_status', status)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function fetchGuineaPigRequests(centerCode?: string, status?: RequestStatus) {
  return apiFetch<GuineaPigRequest[]>(`/requests/guinea-pigs${listQuery(centerCode, status)}`)
}

export function fetchGuineaPigRequest(requestId: string) {
  return apiFetch<GuineaPigRequest>(`/requests/guinea-pigs/${requestId}`)
}

export function createGuineaPigRequest(payload: GuineaPigRequestCreate) {
  return apiFetch<GuineaPigRequest>('/requests/guinea-pigs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function confirmGuineaPigRequest(requestId: string) {
  return apiFetch<GuineaPigRequest>(`/requests/guinea-pigs/${requestId}/confirm-availability`, {
    method: 'POST',
  })
}

export function registerGuineaPigRequestPayment(requestId: string, receiptReference: string) {
  return apiFetch<GuineaPigRequest>(`/requests/guinea-pigs/${requestId}/register-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receipt_reference: receiptReference }),
  })
}

export function authorizeGuineaPigRequest(requestId: string) {
  return apiFetch<GuineaPigRequest>(`/requests/guinea-pigs/${requestId}/authorize`, {
    method: 'POST',
  })
}
