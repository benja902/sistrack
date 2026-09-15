import type { Center } from '@/components/layout/TopBar'

export const inventoryCategories = [
  'Adultos / reproductores H',
  'Adultos / reproductores M',
  'Lactantes',
  'Destete H',
  'Destete M',
  'Juvenil H',
  'Juvenil M',
] as const

export type InventoryCategory = (typeof inventoryCategories)[number]
export type InventoryCenter = Exclude<Center, 'Todos los centros'>
export type InventoryMovementType = 'Salida por venta' | 'Mortalidad'

export type InventoryExistence = {
  id: string
  center: InventoryCenter
  category: InventoryCategory
  physicalStock: number
  reservedStock: number
}

export type InventoryMovement = {
  id: string
  reference: string
  existenceId: string
  occurredAt: string
  center: InventoryCenter
  category: InventoryCategory
  type: InventoryMovementType
  quantity: number
  physicalStockBefore: number
  responsible: string
  registeredBy: string
}

export type InventoryBalance = {
  physicalStock: number
  reservedStock: number
  availableStock: number
}

