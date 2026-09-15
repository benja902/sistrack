import { ArrowLeft, Info } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'
import { useInventoryExistences } from '@/features/inventory/queries/inventory.queries'

import { useCreateGuineaPigRequest } from '../queries/requests.queries'

const centerCodes = { Kotosh: 'KOTOSH', Canchán: 'CANCHAN' } as const

export function RequestCreatePage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState('')
  const [requestedFor, setRequestedFor] = useState('')
  const [quantity, setQuantity] = useState('')
  const [balanceId, setBalanceId] = useState('')
  const centerCode = selectedCenter === 'Todos los centros' ? undefined : centerCodes[selectedCenter]
  const balancesQuery = useInventoryExistences(centerCode)
  const createMutation = useCreateGuineaPigRequest()
  const selectedBalance = useMemo(
    () => balancesQuery.data?.find((balance) => balance.id === balanceId),
    [balanceId, balancesQuery.data],
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    createMutation.mutate({
      inventory_balance_id: balanceId,
      customer_name: customerName,
      requested_quantity: Number(quantity),
      requested_for: requestedFor,
    }, { onSuccess: (request) => navigate(`/solicitudes/${request.id}`) })
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline" to="/solicitudes"><ArrowLeft className="size-4" aria-hidden="true" /> Volver a solicitudes</Link>
      <header><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Cuyes</p><h1 className="mt-1 text-2xl font-bold text-ink">Nueva solicitud</h1><p className="mt-1 text-sm text-slate">Registra el pedido. La disponibilidad se confirmará en el paso siguiente.</p></header>

      <form className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm" onSubmit={submit}>
        {balancesQuery.isError ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No se pudo consultar el inventario.{' '}
            <button className="font-semibold underline" type="button" onClick={() => balancesQuery.refetch()}>
              Reintentar
            </button>
          </div>
        ) : null}
        {balancesQuery.isSuccess && balancesQuery.data.length === 0 ? (
          <p className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate">
            No existen existencias configuradas para el centro seleccionado.
          </p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-ink">Cliente</span><input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" minLength={2} maxLength={150} required value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-ink">Centro y categoría</span><select aria-label="Centro y categoría" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary" required value={balanceId} onChange={(event) => setBalanceId(event.target.value)}><option value="">Seleccionar existencia</option>{balancesQuery.data?.map((balance) => <option key={balance.id} value={balance.id}>{balance.center.name} · {balance.category} · {balance.available_quantity} disponibles</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-ink">Cantidad solicitada</span><input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" min="1" required type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-ink">Fecha solicitada</span><input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" required type="date" value={requestedFor} onChange={(event) => setRequestedFor(event.target.value)} /></label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate">Disponible actual</span><p className="mt-1 text-lg font-bold text-ink">{selectedBalance?.available_quantity ?? '—'} <span className="text-xs font-medium text-slate">ejemplares</span></p></div>
        </div>

        <div className="mt-5 flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>Crear la solicitud no reserva ni reduce inventario. La reserva se crea únicamente al confirmar disponibilidad.</p></div>
        {createMutation.isError ? <p className="mt-4 text-sm font-medium text-red-600">{createMutation.error.message}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><Link className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" to="/solicitudes">Cancelar</Link><button className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={createMutation.isPending || balancesQuery.isPending} type="submit">{createMutation.isPending ? 'Guardando...' : 'Crear solicitud'}</button></div>
      </form>
    </div>
  )
}
