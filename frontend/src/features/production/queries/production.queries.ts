import { useQuery } from '@tanstack/react-query'

import { fetchMilkProduction, fetchMilkProductions } from '../api/production.api'

export const productionQueryKeys = {
  all: ['milk-productions'] as const,
  list: (centerCode?: string) => [...productionQueryKeys.all, 'list', centerCode ?? 'all'] as const,
  detail: (productionId: string) => [...productionQueryKeys.all, 'detail', productionId] as const,
}

export function useMilkProductions(centerCode?: string) {
  return useQuery({
    queryKey: productionQueryKeys.list(centerCode),
    queryFn: () => fetchMilkProductions(centerCode),
  })
}

export function useMilkProduction(productionId: string) {
  return useQuery({
    queryKey: productionQueryKeys.detail(productionId),
    queryFn: () => fetchMilkProduction(productionId),
    enabled: Boolean(productionId),
  })
}
