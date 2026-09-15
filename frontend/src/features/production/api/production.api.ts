import { apiFetch } from '@/services/http'

import type {
  MilkProductionApi,
  MilkProductionCreate,
  MilkProductionDetailApi,
} from '../types/production.types'

export function fetchMilkProductions(centerCode?: string) {
  const query = centerCode ? `?center_code=${encodeURIComponent(centerCode)}` : ''
  return apiFetch<MilkProductionApi[]>(`/production/milk${query}`)
}

export function fetchMilkProduction(productionId: string) {
  return apiFetch<MilkProductionDetailApi>(`/production/milk/${productionId}`)
}

export function createMilkProduction(payload: MilkProductionCreate) {
  return apiFetch<MilkProductionDetailApi>('/production/milk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
