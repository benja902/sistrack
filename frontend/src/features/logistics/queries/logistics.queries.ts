import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { inventoryQueryKeys } from '@/features/inventory/queries/inventory.queries'
import { requestQueryKeys } from '@/features/requests/queries/requests.queries'

import {
  createDispatch,
  departDispatch,
  fetchDispatch,
  fetchDispatches,
  fetchReception,
  fetchReceptions,
  registerReception,
} from '../api/logistics.api'
import type { DispatchCreate, ReceptionCreate } from '../types/logistics.types'

export const logisticsQueryKeys = {
  all: ['logistics'] as const,
  dispatches: (center?: string) => ['logistics', 'dispatches', center ?? 'all'] as const,
  dispatch: (id: string) => ['logistics', 'dispatch', id] as const,
  receptions: (center?: string) => ['logistics', 'receptions', center ?? 'all'] as const,
  reception: (id: string) => ['logistics', 'reception', id] as const,
}

export function useDispatches(centerCode?: string) {
  return useQuery({ queryKey: logisticsQueryKeys.dispatches(centerCode), queryFn: () => fetchDispatches(centerCode) })
}

export function useDispatch(dispatchId: string) {
  return useQuery({ queryKey: logisticsQueryKeys.dispatch(dispatchId), queryFn: () => fetchDispatch(dispatchId), enabled: Boolean(dispatchId) })
}

export function useReceptions(centerCode?: string) {
  return useQuery({ queryKey: logisticsQueryKeys.receptions(centerCode), queryFn: () => fetchReceptions(centerCode) })
}

export function useReception(dispatchId: string) {
  return useQuery({ queryKey: logisticsQueryKeys.reception(dispatchId), queryFn: () => fetchReception(dispatchId), enabled: Boolean(dispatchId) })
}

function useLogisticsMutation<T>(mutationFn: (payload: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: requestQueryKeys.all })
    },
  })
}

export function useCreateDispatch() {
  return useLogisticsMutation((payload: DispatchCreate) => createDispatch(payload))
}

export function useDepartDispatch(dispatchId: string) {
  return useLogisticsMutation(() => departDispatch(dispatchId))
}

export function useRegisterReception(dispatchId: string) {
  return useLogisticsMutation((payload: ReceptionCreate) => registerReception(dispatchId, payload))
}
