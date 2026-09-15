import type {
  InventoryExistence,
  InventoryExistenceApi,
  InventoryMovement,
  InventoryMovementApi,
  InventoryMovementType,
} from '../types/inventory.types'

const movementLabels: Record<InventoryMovementApi['movement_type'], InventoryMovementType> = {
  SALE: 'Salida por venta',
  MORTALITY: 'Mortalidad',
}

export function toInventoryExistence(source: InventoryExistenceApi): InventoryExistence {
  return {
    id: source.id,
    center: source.center.name,
    category: source.category,
    physicalStock: source.physical_quantity,
    reservedStock: source.reserved_quantity,
    availableStock: source.available_quantity,
  }
}

export function toInventoryMovement(source: InventoryMovementApi): InventoryMovement {
  return {
    id: source.id,
    reference: `MOV-${source.id.slice(-8).toUpperCase()}`,
    existenceId: source.balance_id,
    occurredAt: source.occurred_at,
    center: source.center.name,
    category: source.category,
    type: movementLabels[source.movement_type],
    quantity: source.quantity,
    physicalStockBefore: source.physical_quantity_before,
    physicalStockAfter: source.physical_quantity_after,
    description: source.description,
    registeredBy: source.registered_by.full_name,
  }
}
