import { ArrowLeft, Boxes, GitBranch } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { InventoryRequestState } from '../components/InventoryRequestState'
import { MovementTypeBadge } from '../components/MovementTypeBadge'
import { toInventoryMovement } from '../data/inventory.mapper'
import { formatInventoryDateTime } from '../data/inventory.selectors'
import { useInventoryMovement } from '../queries/inventory.queries'

export function InventoryMovementDetailPage() {
  const { movementId } = useParams()
  const movementQuery = useInventoryMovement(movementId ?? '')

  if (movementQuery.isPending) return <InventoryRequestState state="loading" />
  if (movementQuery.isError) {
    return <InventoryRequestState state="error" onRetry={() => movementQuery.refetch()} />
  }

  const movementSource = movementQuery.data

  if (!movementSource) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-border-subtle bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-ink">Movimiento no encontrado</h1>
        <Link className="mt-4 inline-block text-sm font-semibold text-primary hover:underline" to="/inventario/movimientos">
          Volver a movimientos
        </Link>
      </div>
    )
  }

  const movement = toInventoryMovement(movementSource)

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <div className="flex items-center justify-between text-xs text-slate">
        <p>Inventario / Movimientos / <span className="font-semibold text-ink">Detalle</span></p>
        <Link className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline" to="/inventario/movimientos">
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver a movimientos
        </Link>
      </div>

      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Detalle de movimiento</h1>
            <MovementTypeBadge type={movement.type} />
          </div>
          <p className="mt-1.5 font-mono text-[13px] font-semibold text-ink">{movement.reference}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-canvas" to={`/inventario/existencias/${movement.existenceId}`}>
            <Boxes className="size-4 text-primary" aria-hidden="true" /> Ver existencia afectada
          </Link>
          <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-container" to="/trazabilidad">
            <GitBranch className="size-4" aria-hidden="true" /> Consultar trazabilidad
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm lg:col-span-7">
          <h2 className="border-b border-border-subtle pb-3 text-sm font-semibold uppercase tracking-wider text-ink">Qué ocurrió</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate">Tipo</dt><dd className="mt-0.5 font-medium text-ink">{movement.type}</dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate">Fecha y hora</dt><dd className="mt-0.5 font-medium text-ink">{formatInventoryDateTime(movement.occurredAt)}</dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate">Cantidad</dt><dd className="mt-0.5 text-lg font-bold text-primary">{movement.quantity} ejemplares</dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate">Registrado por</dt><dd className="mt-0.5 font-medium text-ink">{movement.registeredBy}</dd></div>
            <div className="col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate">Descripción</dt><dd className="mt-0.5 font-medium text-ink">{movement.description}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm lg:col-span-5">
          <h2 className="border-b border-border-subtle pb-3 text-sm font-semibold uppercase tracking-wider text-ink">Stock afectado</h2>
          <dl className="mt-4 space-y-4 text-[13px]">
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate">Centro</dt><dd className="mt-0.5 font-semibold text-ink">{movement.center}</dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate">Categoría</dt><dd className="mt-0.5 font-semibold text-ink">{movement.category}</dd></div>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-border-subtle pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-ink">Impacto en inventario</h2>
            <p className="mt-0.5 text-xs text-slate">Efecto de la salida física sobre la existencia de la categoría.</p>
          </div>
          <code className="w-fit rounded-lg border border-border-subtle bg-canvas px-3 py-1.5 text-xs text-slate">
            {movement.physicalStockBefore} − {Math.abs(movement.quantity)} = {movement.physicalStockAfter}
          </code>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-border-subtle bg-canvas p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate">Existencia antes</p><p className="mt-2 text-3xl font-bold text-ink">{movement.physicalStockBefore}</p><p className="text-xs text-slate">ejemplares</p></div>
          <div className="rounded-xl border border-border-subtle bg-canvas p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate">Variación</p><p className="mt-2 text-3xl font-bold text-primary">{movement.quantity}</p><p className="text-xs text-slate">ejemplares</p></div>
          <div className="rounded-xl border border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Existencia después</p><p className="mt-2 text-3xl font-bold text-emerald-700">{movement.physicalStockAfter}</p><p className="text-xs text-emerald-800">ejemplares</p></div>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="border-b border-border-subtle pb-2.5 text-xs font-semibold uppercase tracking-wider text-ink">Información del registro</h2>
        <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
          <div><dt className="text-slate">Referencia</dt><dd className="font-mono font-semibold text-ink">{movement.reference}</dd></div>
          <div><dt className="text-slate">Registrado por</dt><dd className="font-medium text-ink">{movement.registeredBy}</dd></div>
        </dl>
      </section>
    </div>
  )
}
