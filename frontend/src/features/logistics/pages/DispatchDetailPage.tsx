import { ArrowLeft, CheckCircle2, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { LogisticsState } from '../components/LogisticsState'
import { DispatchStatusBadge, ReceptionStatusBadge } from '../components/LogisticsStatusBadge'
import { LogisticsTabs } from '../components/LogisticsTabs'
import { useDepartDispatch, useDispatch } from '../queries/logistics.queries'

const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

function Field({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate">{label}</span><strong className="mt-1 block text-sm text-ink">{value}</strong></div>
}

export function DispatchDetailPage() {
  const { dispatchId = '' } = useParams()
  const dispatchQuery = useDispatch(dispatchId)
  const departMutation = useDepartDispatch(dispatchId)
  if (dispatchQuery.isPending) return <LogisticsState />
  if (dispatchQuery.isError) return <LogisticsState onRetry={() => dispatchQuery.refetch()} />
  const dispatch = dispatchQuery.data

  return <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6"><div className="flex items-center justify-between"><LogisticsTabs /><Link className="inline-flex items-center gap-1 text-xs font-semibold text-primary" to="/logistica"><ArrowLeft className="size-4" /> Volver</Link></div><section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Detalle de despacho</p><h1 className="mt-1 text-2xl font-bold">{dispatch.dispatch_code}</h1><p className="mt-1 text-sm text-slate">Origen {dispatch.source_code}</p></div><DispatchStatusBadge status={dispatch.status} /></div></section><section className="grid gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"><Field label="Producto" value={dispatch.product.name} /><Field label="Cantidad" value={`${Number(dispatch.quantity)} ${dispatch.unit_of_measure}`} /><Field label="Centro de origen" value={dispatch.center.name} /><Field label="Destino" value={dispatch.destination} /><Field label="Modalidad" value={dispatch.delivery_mode === 'DRIVER' ? 'Conductor' : 'Retiro directo'} /><Field label="Custodia física" value={dispatch.driver_actor?.full_name ?? 'Retiro directo'} /><Field label="Registrado por" value={dispatch.created_by_user.full_name} /><Field label="Salida" value={dispatch.dispatched_at ? dateTime.format(new Date(dispatch.dispatched_at)) : 'Pendiente'} /></section>{dispatch.status === 'PENDING' ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold text-amber-900">Pendiente de salida física</h2><p className="mt-1 text-xs text-amber-800">El personal de origen debe confirmar la entrega. En cuyes, esta acción reduce existencia y libera la reserva.</p></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={departMutation.isPending} type="button" onClick={() => departMutation.mutate()}><Truck className="size-4" /> Confirmar salida física</button></div>{departMutation.isError ? <p className="mt-3 text-sm text-red-600">{departMutation.error.message}</p> : null}</section> : null}{dispatch.status === 'IN_TRANSIT' ? <section className="rounded-xl border border-blue-200 bg-blue-50 p-5"><h2 className="text-sm font-semibold text-blue-900">En transporte</h2><p className="mt-1 text-xs text-blue-800">Custodia física: {dispatch.driver_actor?.full_name}. El conductor no requiere acceso al sistema.</p><Link className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline" to={`/logistica/recepciones/${dispatch.id}`}>Registrar recepción</Link></section> : null}{dispatch.status === 'COMPLETED' ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-2"><CheckCircle2 className="size-5 text-emerald-700" /><div><h2 className="text-sm font-semibold text-emerald-900">Despacho completado</h2><p className="mt-1 text-xs text-emerald-800">{dispatch.reception ? <>Recepción <ReceptionStatusBadge status={dispatch.reception.status} /></> : 'Retiro directo completado con la salida física.'}</p></div></div></section> : null}</div>
}
