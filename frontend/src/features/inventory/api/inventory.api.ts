import { apiFetch } from '@/services/http'

import type {
  InventoryExistenceApi,
  InventoryExistenceDetailApi,
  InventoryMovementApi,
  InventoryMovementCreate,
} from '../types/inventory.types'

function centerQuery(centerCode?: string) {
  return centerCode ? `?center_code=${encodeURIComponent(centerCode)}` : ''
}

export function fetchInventoryExistences(centerCode?: string) {
  return apiFetch<InventoryExistenceApi[]>(`/inventory/existences${centerQuery(centerCode)}`)
}

export function fetchInventoryExistence(existenceId: string) {
  return apiFetch<InventoryExistenceDetailApi>(`/inventory/existences/${existenceId}`)
}

export function fetchInventoryMovements(centerCode?: string) {
  return apiFetch<InventoryMovementApi[]>(`/inventory/movements${centerQuery(centerCode)}`)
}

export function fetchInventoryMovement(movementId: string) {
  return apiFetch<InventoryMovementApi>(`/inventory/movements/${movementId}`)
}

export function createInventoryMovement(payload: InventoryMovementCreate) {
  return apiFetch<InventoryMovementApi>('/inventory/movements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

