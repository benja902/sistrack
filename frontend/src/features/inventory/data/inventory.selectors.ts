import type { Center } from '@/components/layout/TopBar'

import type {
  InventoryBalance,
  InventoryCategory,
  InventoryExistence,
  InventoryMovement,
  InventoryMovementType,
} from '../types/inventory.types'

export function getAvailableStock(existence: InventoryExistence) {
  return existence.physicalStock - existence.reservedStock
}

export function getMovementStockAfter(movement: InventoryMovement) {
  return movement.physicalStockBefore - movement.quantity
}

export function filterBySelectedCenter<T extends { center: string }>(records: T[], center: Center) {
  return center === 'Todos los centros' ? records : records.filter((record) => record.center === center)
}

export function summarizeExistences(existences: InventoryExistence[]): InventoryBalance {
  return existences.reduce(
    (summary, existence) => ({
      physicalStock: summary.physicalStock + existence.physicalStock,
      reservedStock: summary.reservedStock + existence.reservedStock,
      availableStock: summary.availableStock + getAvailableStock(existence),
    }),
    { physicalStock: 0, reservedStock: 0, availableStock: 0 },
  )
}

export function sumMovementQuantity(movements: InventoryMovement[], type: InventoryMovementType) {
  return movements
    .filter((movement) => movement.type === type)
    .reduce((total, movement) => total + movement.quantity, 0)
}

export function summarizeExistencesByCategory(existences: InventoryExistence[]) {
  const grouped = new Map<InventoryCategory, number>()

  existences.forEach((existence) => {
    grouped.set(existence.category, (grouped.get(existence.category) ?? 0) + existence.physicalStock)
  })

  return Array.from(grouped, ([category, physicalStock]) => ({ category, physicalStock }))
}

export function formatInventoryDateTime(value: string) {
  const date = new Date(value)
  const day = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(date)
  const time = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(date)

  return `${day} — ${time}`
}
