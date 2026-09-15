import { PackageOpen, Plus, X } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'
import { useMilkProductions } from '@/features/production/queries/production.queries'
import { useGuineaPigRequests } from '@/features/requests/queries/requests.queries'

import { LogisticsState } from '../components/LogisticsState'
import { DispatchStatusBadge } from '../components/LogisticsStatusBadge'
import { LogisticsTabs } from '../components/LogisticsTabs'
import { useCreateDispatch, useDispatches } from '../queries/logistics.queries'
import type { DeliveryMode, LogisticsSourceType } from '../types/logistics.types'

const centerCodes = { Kotosh: 'KOTOSH', Canchán: 'CANCHAN' } as const
const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

export function DispatchListPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const centerCode = selectedCenter === 'Todos los centros' ? undefined : centerCodes[selectedCenter]
  const dispatchesQuery = useDispatches(centerCode)
  const productionsQuery = useMilkProductions(centerCode)
  const requestsQuery = useGuineaPigRequests(centerCode, 'AUTHORIZED')
  const createMutation = useCreateDispatch()
  const [showForm, setShowForm] = useState(false)
  const [sourceValue, setSourceValue] = useState('')
  const [destination, setDestination] = useState('')
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('DRIVER')
  const [driverName, setDriverName] = useState('')
  const usedSources = useMemo(() => new Set(dispatchesQuery.data?.map((dispatch) => `${dispatch.source_type}:${dispatch.milk_production_id ?? dispatch.guinea_pig_request_id}`)), [dispatchesQuery.data])

  if (dispatchesQuery.isPending) return <LogisticsState />
  if (dispatchesQuery.isError) return <LogisticsState onRetry={() => dispatchesQuery.refetch()} />

  function submit(event: FormEvent) {
    event.preventDefault()
    const [sourceType, sourceId] = sourceValue.split(':') as [LogisticsSourceType, string]
    createMutation.mutate({ source_type: sourceType, source_id: sourceId, destination, delivery_mode: deliveryMode, ...(deliveryMode === 'DRIVER' ? { driver_name: driverName } : {}) }, { onSuccess: () => { setShowForm(false); setSourceValue(''); setDestination(''); setDriverName('') } })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Operación física</p><h1 className="mt-1 text-2xl font-bold text-ink">Logística</h1><p className="mt-1 text-sm text-slate">Despachos desde {selectedCenter.toLowerCase()}.</p></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? <X className="size-4" /> : <Plus className="size-4" />}{showForm ? 'Cerrar' : 'Nuevo despacho'}</button></header>
      <LogisticsTabs />

      {showForm ? <form className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm" onSubmit={submit}><h2 className="text-sm font-semibold text-ink">Preparar despacho</h2><p className="mt-1 text-xs text-slate">La cantidad se obtiene automáticamente del lote o solicitud seleccionada.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="mb-1 block text-xs font-semibold">Origen</span><select aria-label="Origen del despacho" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" required value={sourceValue} onChange={(event) => setSourceValue(event.target.value)}><option value="">Seleccionar origen</option>{productionsQuery.data?.filter((item) => !usedSources.has(`MILK_PRODUCTION:${item.id}`)).map((item) => <option key={item.id} value={`MILK_PRODUCTION:${item.id}`}>Leche · {item.lot_code} · {item.total_liters} L</option>)}{requestsQuery.data?.filter((item) => !usedSources.has(`GUINEA_PIG_REQUEST:${item.id}`)).map((item) => <option key={item.id} value={`GUINEA_PIG_REQUEST:${item.id}`}>Cuyes · {item.request_code} · {item.requested_quantity} ejemplares</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold">Destino</span><input aria-label="Destino" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" minLength={2} required value={destination} onChange={(event) => setDestination(event.target.value)} /></label><label><span className="mb-1 block text-xs font-semibold">Modalidad</span><select aria-label="Modalidad" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value as DeliveryMode)}><option value="DRIVER">Conductor</option><option value="DIRECT_PICKUP">Retiro directo</option></select></label>{deliveryMode === 'DRIVER' ? <label><span className="mb-1 block text-xs font-semibold">Conductor / custodio físico</span><input aria-label="Conductor" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" minLength={2} required value={driverName} onChange={(event) => setDriverName(event.target.value)} /></label> : null}</div>{createMutation.isError ? <p className="mt-4 text-sm text-red-600">{createMutation.error.message}</p> : null}<div className="mt-5 flex justify-end"><button className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? 'Guardando...' : 'Crear despacho pendiente'}</button></div></form> : null}

      {dispatchesQuery.data.length === 0 ? <section className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8 text-center"><div><PackageOpen className="mx-auto size-8 text-slate-400" /><h2 className="mt-3 text-base font-semibold">Sin despachos</h2><p className="mt-1 text-sm text-slate">No existen despachos para el centro seleccionado.</p></div></section> : <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b bg-slate-50 text-[11px] uppercase tracking-wider text-slate"><tr><th className="px-5 py-3">Despacho</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3">Destino</th><th className="px-4 py-3">Estado</th><th className="px-5 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y">{dispatchesQuery.data.map((dispatch) => <tr key={dispatch.id}><td className="px-5 py-4 font-mono font-semibold text-primary">{dispatch.dispatch_code}<span className="mt-1 block font-sans text-[10px] font-normal text-slate">{dateTime.format(new Date(dispatch.created_at))}</span></td><td className="px-4 py-4 font-medium">{dispatch.source_code}</td><td className="px-4 py-4">{dispatch.product.name}</td><td className="px-4 py-4 text-right font-bold">{Number(dispatch.quantity)} {dispatch.unit_of_measure}</td><td className="px-4 py-4">{dispatch.destination}</td><td className="px-4 py-4"><DispatchStatusBadge status={dispatch.status} /></td><td className="px-5 py-4 text-right"><Link className="font-semibold text-primary hover:underline" to={`/logistica/despachos/${dispatch.id}`}>Ver detalle</Link></td></tr>)}</tbody></table></div></section>}
    </div>
  )
}
