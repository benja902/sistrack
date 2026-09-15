import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createInventoryMovement,
  fetchInventoryExistence,
  fetchInventoryExistences,
  fetchInventoryMovement,
  fetchInventoryMovements,
} from '../api/inventory.api'

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  existences: (centerCode?: string) => [
    ...inventoryQueryKeys.all,
    'existences',
    centerCode ?? 'all',
  ] as const,
  existence: (existenceId: string) => [
    ...inventoryQueryKeys.all,
    'existence',
    existenceId,
  ] as const,
  movements: (centerCode?: string) => [
    ...inventoryQueryKeys.all,
    'movements',
    centerCode ?? 'all',
  ] as const,
  movement: (movementId: string) => [
    ...inventoryQueryKeys.all,
    'movement',
    movementId,
  ] as const,
}

export function useInventoryExistences(centerCode?: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.existences(centerCode),
    queryFn: () => fetchInventoryExistences(centerCode),
  })
}

export function useInventoryExistence(existenceId: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.existence(existenceId),
    queryFn: () => fetchInventoryExistence(existenceId),
    enabled: Boolean(existenceId),
  })
}

export function useInventoryMovements(centerCode?: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.movements(centerCode),
    queryFn: () => fetchInventoryMovements(centerCode),
  })
}

export function useInventoryMovement(movementId: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.movement(movementId),
    queryFn: () => fetchInventoryMovement(movementId),
    enabled: Boolean(movementId),
  })
}

export function useCreateInventoryMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInventoryMovement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all }),
  })
}

