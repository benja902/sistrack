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
export type InventoryMovementTypeApi = 'SALE' | 'MORTALITY'
export type InventoryMovementType = 'Salida por venta' | 'Mortalidad'

export type InventoryCenterApi = {
  id: string
  code: 'KOTOSH' | 'CANCHAN'
  name: 'Kotosh' | 'Canchán'
}

export type InventoryUserApi = {
  id: string
  full_name: string
}

export type InventoryMovementApi = {
  id: string
  balance_id: string
  center: InventoryCenterApi
  category: InventoryCategory
  movement_type: InventoryMovementTypeApi
  quantity: number
  physical_quantity_before: number
  physical_quantity_after: number
  reference_type: string | null
  reference_id: string | null
  description: string
  registered_by_user_id: string
  registered_by: InventoryUserApi
  occurred_at: string
  created_at: string
}

export type InventoryExistenceApi = {
  id: string
  center: InventoryCenterApi
  category: InventoryCategory
  physical_quantity: number
  reserved_quantity: number
  available_quantity: number
  created_at: string
  updated_at: string
}

export type InventoryExistenceDetailApi = InventoryExistenceApi & {
  movements: InventoryMovementApi[]
}

export type InventoryMovementCreate = {
  center_id: string
  category: InventoryCategory
  movement_type: InventoryMovementTypeApi
  quantity: number
  reference_type?: string
  reference_id?: string
  description: string
  occurred_at: string
}

export type InventoryExistence = {
  id: string
  center: InventoryCenterApi['name']
  category: InventoryCategory
  physicalStock: number
  reservedStock: number
  availableStock: number
}

export type InventoryMovement = {
  id: string
  reference: string
  existenceId: string
  occurredAt: string
  center: InventoryCenterApi['name']
  category: InventoryCategory
  type: InventoryMovementType
  quantity: number
  physicalStockBefore: number
  physicalStockAfter: number
  description: string
  registeredBy: string
}

export type InventoryBalance = {
  physicalStock: number
  reservedStock: number
  availableStock: number
}

