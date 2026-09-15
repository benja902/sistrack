import type { InventoryMovementType } from '../types/inventory.types'

export function MovementTypeBadge({ type }: { type: InventoryMovementType }) {
  const className = type === 'Mortalidad'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-blue-100 bg-blue-50 text-primary'

  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      {type}
    </span>
  )
}

