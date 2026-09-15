import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { inventoryQueryKeys } from '@/features/inventory/queries/inventory.queries'

import {
  authorizeGuineaPigRequest,
  confirmGuineaPigRequest,
  createGuineaPigRequest,
  fetchGuineaPigRequest,
  fetchGuineaPigRequests,
  registerGuineaPigRequestPayment,
} from '../api/requests.api'
import type { GuineaPigRequestCreate, RequestStatus } from '../types/request.types'

export const requestQueryKeys = {
  all: ['guinea-pig-requests'] as const,
  list: (centerCode?: string, status?: RequestStatus) => [
    ...requestQueryKeys.all,
    'list',
    centerCode ?? 'all',
    status ?? 'all',
  ] as const,
  detail: (requestId: string) => [...requestQueryKeys.all, 'detail', requestId] as const,
}

export function useGuineaPigRequests(centerCode?: string, status?: RequestStatus) {
  return useQuery({
    queryKey: requestQueryKeys.list(centerCode, status),
    queryFn: () => fetchGuineaPigRequests(centerCode, status),
  })
}

export function useGuineaPigRequest(requestId: string) {
  return useQuery({
    queryKey: requestQueryKeys.detail(requestId),
    queryFn: () => fetchGuineaPigRequest(requestId),
    enabled: Boolean(requestId),
  })
}

function useWorkflowMutation<TVariable = void>(mutationFn: (variable: TVariable) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all })
    },
  })
}

export function useCreateGuineaPigRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GuineaPigRequestCreate) => createGuineaPigRequest(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestQueryKeys.all }),
  })
}

export function useConfirmGuineaPigRequest(requestId: string) {
  return useWorkflowMutation(() => confirmGuineaPigRequest(requestId))
}

export function useRegisterGuineaPigRequestPayment(requestId: string) {
  return useWorkflowMutation((receiptReference: string) =>
    registerGuineaPigRequestPayment(requestId, receiptReference),
  )
}

export function useAuthorizeGuineaPigRequest(requestId: string) {
  return useWorkflowMutation(() => authorizeGuineaPigRequest(requestId))
}
