import { CheckCircle2, LockKeyhole, PawPrint } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import { InventoryPageHeader } from '../components/InventoryPageHeader'
import { InventorySummaryCard } from '../components/InventorySummaryCard'
import { InventoryTabs } from '../components/InventoryTabs'
import { inventoryExistencesMock } from '../data/inventory.mock'
import {
  filterBySelectedCenter,
  getAvailableStock,
  summarizeExistences,
  summarizeExistencesByCategory,
} from '../data/inventory.selectors'
import { inventoryCategories, type InventoryCategory } from '../types/inventory.types'

type CategoryFilter = 'Todas las categorías' | InventoryCategory

export function InventoryExistencePage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('Todas las categorías')

  const centerExistences = useMemo(
    () => filterBySelectedCenter(inventoryExistencesMock, selectedCenter),
    [selectedCenter],
  )
  const visibleExistences = categoryFilter === 'Todas las categorías'
    ? centerExistences
    : centerExistences.filter((existence) => existence.category === categoryFilter)
  const summary = summarizeExistences(centerExistences)
  const categories = summarizeExistencesByCategory(centerExistences)

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
      <InventoryPageHeader description="Consulta y control de existencias del centro seleccionado." />
      <InventoryTabs />

      <section className="grid gap-4 md:grid-cols-3" aria-label="Resumen de existencias">
        <InventorySummaryCard eyebrow="Existencia" title="Existencia física" value={summary.physicalStock} icon={PawPrint} />
        <InventorySummaryCard eyebrow="Reservas" title="Reservado" value={summary.reservedStock} icon={LockKeyhole} tone="warning" />
        <InventorySummaryCard eyebrow="Disponibilidad" title="Disponible" value={summary.availableStock} icon={CheckCircle2} tone="success" />
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-sm font-bold text-ink">Resumen por categoría</h2>
            <p className="mt-0.5 text-xs text-slate">Existencia física agrupada para {selectedCenter.toLowerCase()}.</p>
          </div>
          <span className="w-fit rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate">
            {categories.length} categorías
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {categories.map(({ category, physicalStock }) => (
            <div key={category} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <p className="min-h-9 text-[11px] font-semibold leading-4 text-slate">{category}</p>
              <p className="mt-1 text-lg font-bold text-ink">{physicalStock}</p>
              <p className="text-[10px] font-medium text-slate">ejemplares</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-ink">Existencias por centro y categoría</h2>
            <p className="mt-0.5 text-xs text-slate">El disponible se calcula restando lo reservado de la existencia física.</p>
          </div>
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate">
            Categoría
            <select
              className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium normal-case tracking-normal text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
            >
              <option>Todas las categorías</option>
              {inventoryCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs text-ink">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate">
              <tr>
                <th className="px-6 py-3">Centro</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3 text-right">Existencia física</th>
                <th className="px-6 py-3 text-right">Reservado</th>
                <th className="px-6 py-3 text-right">Disponible</th>
                <th className="px-6 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleExistences.map((existence) => (
                <tr key={existence.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-6 py-3.5 font-medium">{existence.center}</td>
                  <td className="px-6 py-3.5 font-medium text-slate-700">{existence.category}</td>
                  <td className="px-6 py-3.5 text-right font-bold">{existence.physicalStock}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-amber-700">{existence.reservedStock}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-emerald-700">{getAvailableStock(existence)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <Link className="font-semibold text-primary hover:underline" to={`/inventario/existencias/${existence.id}`}>
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate">
          Mostrando {visibleExistences.length} registros
        </div>
      </section>
    </div>
  )
}

