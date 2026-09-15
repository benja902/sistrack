import { ClipboardList, Plus } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import { ReceiptStatusBadge, RequestStatusBadge } from '../components/RequestStatusBadge'
import { RequestState } from '../components/RequestState'
import { useGuineaPigRequests } from '../queries/requests.queries'

const centerCodes = { Kotosh: 'KOTOSH', Canchán: 'CANCHAN' } as const
const dateFormatter = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

export function RequestListPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const centerCode = selectedCenter === 'Todos los centros' ? undefined : centerCodes[selectedCenter]
  const requestsQuery = useGuineaPigRequests(centerCode)

  if (requestsQuery.isPending) return <RequestState />
  if (requestsQuery.isError) return <RequestState onRetry={() => requestsQuery.refetch()} />

  const requests = requestsQuery.data

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Cuyes</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Solicitudes</h1>
          <p className="mt-1 text-sm text-slate">Gestión previa a la salida física para {selectedCenter.toLowerCase()}.</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90" to="/solicitudes/nueva">
          <Plus className="size-4" aria-hidden="true" /> Nueva solicitud
        </Link>
      </header>

      <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
        Confirmar disponibilidad crea una reserva y reduce el disponible. La existencia física solo cambiará cuando Logística registre una salida.
      </section>

      {requests.length === 0 ? (
        <section className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8 text-center shadow-sm">
          <div>
            <ClipboardList className="mx-auto size-8 text-slate-400" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-ink">Sin solicitudes</h2>
            <p className="mt-1 text-sm text-slate">No existen solicitudes para el centro seleccionado.</p>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate">
                <tr><th className="px-5 py-3">Solicitud</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Centro / categoría</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3">Fecha solicitada</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Boleta</th><th className="px-5 py-3 text-right">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-mono font-semibold text-primary">{request.request_code}</td>
                    <td className="px-4 py-4 font-semibold text-ink">{request.customer_name}</td>
                    <td className="px-4 py-4"><span className="block font-medium text-ink">{request.inventory_balance.center.name}</span><span className="text-slate">{request.inventory_balance.category}</span></td>
                    <td className="px-4 py-4 text-right font-bold">{request.requested_quantity}</td>
                    <td className="px-4 py-4 text-slate">{dateFormatter.format(new Date(`${request.requested_for}T12:00:00`))}</td>
                    <td className="px-4 py-4"><RequestStatusBadge status={request.status} /></td>
                    <td className="px-4 py-4"><ReceiptStatusBadge status={request.receipt_status} /></td>
                    <td className="px-5 py-4 text-right"><Link className="font-semibold text-primary hover:underline" to={`/solicitudes/${request.id}`}>Ver detalle</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate">Mostrando {requests.length} solicitudes</div>
        </section>
      )}
    </div>
  )
}
