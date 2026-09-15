import { ArrowLeft, CheckCircle2, LockKeyhole, PawPrint } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { InventorySummaryCard } from '../components/InventorySummaryCard'
import { MovementTypeBadge } from '../components/MovementTypeBadge'
import { inventoryExistencesMock, inventoryMovementsMock } from '../data/inventory.mock'
import { formatInventoryDateTime, getAvailableStock } from '../data/inventory.selectors'

export function InventoryExistenceDetailPage() {
  const { existenceId } = useParams()
  const existence = inventoryExistencesMock.find((item) => item.id === existenceId)

  if (!existence) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-border-subtle bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-ink">Existencia no encontrada</h1>
        <Link className="mt-4 inline-block text-sm font-semibold text-primary hover:underline" to="/inventario">
          Volver a existencias
        </Link>
      </div>
    )
  }

  const relatedMovements = inventoryMovementsMock.filter((movement) => movement.existenceId === existence.id)

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <div className="flex items-center justify-between text-xs text-slate">
        <p>Inventario / Existencias / <span className="font-semibold text-ink">Detalle</span></p>
        <Link className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline" to="/inventario">
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver a existencias
        </Link>
      </div>

      <section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Detalle de existencia</h1>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">
            {existence.category}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-slate">{existence.center}</p>
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="border-b border-border-subtle pb-3 text-sm font-semibold text-ink">Centro y categoría</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border-subtle/60 bg-canvas p-3">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate">Centro</span>
            <strong className="mt-0.5 block text-sm text-ink">{existence.center}</strong>
          </div>
          <div className="rounded-lg border border-border-subtle/60 bg-canvas p-3">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate">Categoría</span>
            <strong className="mt-0.5 block text-sm text-ink">{existence.category}</strong>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold text-ink">Estado actual</h2>
            <p className="text-xs text-slate">Balance físico y disponibilidad de esta categoría.</p>
          </div>
          <code className="w-fit rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700">
            Disponible = Existencia física − Reservado
          </code>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InventorySummaryCard eyebrow="Existencia" title="Existencia física" value={existence.physicalStock} icon={PawPrint} />
          <InventorySummaryCard eyebrow="Reservas" title="Reservado" value={existence.reservedStock} icon={LockKeyhole} tone="warning" />
          <InventorySummaryCard eyebrow="Disponibilidad" title="Disponible" value={getAvailableStock(existence)} icon={CheckCircle2} tone="success" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-border-subtle p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-ink">Movimientos relacionados</h2>
            <p className="mt-0.5 text-xs text-slate">Movimientos que afectaron la existencia física de esta categoría.</p>
          </div>
          <Link className="text-xs font-semibold text-primary hover:underline" to="/inventario/movimientos">Ver todos los movimientos</Link>
        </div>
        {relatedMovements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-border-subtle bg-canvas text-[11px] font-semibold uppercase tracking-wider text-slate">
                <tr><th className="px-5 py-3">Fecha y hora</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3">Referencia</th><th className="px-5 py-3 text-right">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {relatedMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-5 py-3.5 font-medium text-ink">{formatInventoryDateTime(movement.occurredAt)}</td>
                    <td className="px-4 py-3.5"><MovementTypeBadge type={movement.type} /></td>
                    <td className="px-4 py-3.5 text-right font-bold">−{movement.quantity}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold">{movement.reference}</td>
                    <td className="px-5 py-3.5 text-right"><Link className="font-semibold text-primary hover:underline" to={`/inventario/movimientos/${movement.id}`}>Ver detalle</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-slate">No hay movimientos asociados en los datos disponibles.</p>
        )}
      </section>
    </div>
  )
}

