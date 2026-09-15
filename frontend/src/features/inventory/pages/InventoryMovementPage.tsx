import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import { InventoryPageHeader } from '../components/InventoryPageHeader'
import { InventorySummaryCard } from '../components/InventorySummaryCard'
import { InventoryTabs } from '../components/InventoryTabs'
import { MovementTypeBadge } from '../components/MovementTypeBadge'
import { inventoryMovementsMock } from '../data/inventory.mock'
import {
  filterBySelectedCenter,
  formatInventoryDateTime,
  sumMovementQuantity,
} from '../data/inventory.selectors'
import {
  inventoryCategories,
  type InventoryCategory,
  type InventoryMovementType,
} from '../types/inventory.types'

type TypeFilter = 'Todos los tipos' | InventoryMovementType
type CategoryFilter = 'Todas las categorías' | InventoryCategory

export function InventoryMovementPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('Todos los tipos')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('Todas las categorías')
  const [search, setSearch] = useState('')

  const centerMovements = useMemo(
    () => filterBySelectedCenter(inventoryMovementsMock, selectedCenter),
    [selectedCenter],
  )
  const visibleMovements = centerMovements.filter((movement) => {
    const matchesType = typeFilter === 'Todos los tipos' || movement.type === typeFilter
    const matchesCategory = categoryFilter === 'Todas las categorías' || movement.category === categoryFilter
    const matchesSearch = movement.reference.toLowerCase().includes(search.trim().toLowerCase())
    return matchesType && matchesCategory && matchesSearch
  })

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
      <InventoryPageHeader description="Consulta y seguimiento de movimientos que afectan la existencia física." />
      <InventoryTabs />

      <section className="grid gap-4 md:grid-cols-2" aria-label="Resumen de movimientos mostrados">
        <InventorySummaryCard
          eyebrow="Salidas físicas"
          title="Salidas por venta en el historial mostrado"
          value={sumMovementQuantity(visibleMovements, 'Salida por venta')}
          icon={ArrowUpRight}
        />
        <InventorySummaryCard
          eyebrow="Bajas registradas"
          title="Mortalidad en el historial mostrado"
          value={sumMovementQuantity(visibleMovements, 'Mortalidad')}
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-semibold text-ink">Historial de movimientos</h2>
          <p className="mt-0.5 text-xs text-slate">Registro de eventos que modifican la existencia física del inventario.</p>
        </div>
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate">
              Tipo
              <select className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium normal-case tracking-normal text-ink outline-none focus:border-primary" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
                <option>Todos los tipos</option>
                <option>Salida por venta</option>
                <option>Mortalidad</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate">
              Categoría
              <select className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium normal-case tracking-normal text-ink outline-none focus:border-primary" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}>
                <option>Todas las categorías</option>
                {inventoryCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          <input
            className="h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary xl:w-64"
            aria-label="Buscar movimiento"
            placeholder="Buscar por referencia MOV..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {visibleMovements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs text-ink">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate">
                <tr>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Centro</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Responsable / registrador</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMovements.map((movement) => (
                  <tr key={movement.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium">{formatInventoryDateTime(movement.occurredAt)}</td>
                    <td className="px-4 py-3.5">{movement.center}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{movement.category}</td>
                    <td className="px-4 py-3.5"><MovementTypeBadge type={movement.type} /></td>
                    <td className="px-4 py-3.5 text-right font-bold">−{movement.quantity}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold">{movement.reference}</td>
                    <td className="px-4 py-3.5">
                      <span className="block font-medium">{movement.responsible}</span>
                      <span className="block text-[11px] text-slate">Registró: {movement.registeredBy}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link className="font-semibold text-primary hover:underline" to={`/inventario/movimientos/${movement.id}`}>Ver detalle</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <h3 className="text-sm font-semibold text-ink">Sin movimientos</h3>
            <p className="mt-1 text-xs text-slate">No hay movimientos que coincidan con el centro y los filtros seleccionados.</p>
          </div>
        )}
        <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate">Mostrando {visibleMovements.length} movimientos</div>
      </section>
    </div>
  )
}

