import { ArrowLeft, CircleAlert } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { IncidentState } from '../components/IncidentState'
import { IncidentStatusBadge } from '../components/IncidentStatusBadge'
import { useCloseIncident, useIncident } from '../queries/incidents.queries'

const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
function Field({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div> }

export function IncidentDetailPage() {
  const { incidentId = '' } = useParams()
  const query = useIncident(incidentId)
  const mutation = useCloseIncident(incidentId)
  const [resolution, setResolution] = useState('')
  if (query.isPending) return <IncidentState />
  if (query.isError) return <IncidentState onRetry={() => query.refetch()} />
  const incident = query.data
  const reception = incident.reception
  const dispatch = reception.dispatch
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate(resolution) }

  return <div className="mx-auto flex w-full max-w-[950px] flex-col gap-6"><Link className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary" to="/incidencias"><ArrowLeft className="size-4" /> Volver a incidencias</Link><section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Incidencia por diferencia</p><h1 className="mt-1 text-2xl font-bold">{incident.incident_code}</h1><p className="mt-1 text-sm text-slate">Origen: Recepción del despacho {dispatch.dispatch_code}</p></div><IncidentStatusBadge status={incident.status} /></div></section><section className="grid gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"><Field label="Producto" value={dispatch.product.name} /><Field label="Centro de origen" value={dispatch.center.name} /><Field label="Destino" value={dispatch.destination} /><Field label="Referencia origen" value={dispatch.source_code} /><Field label="Cantidad despachada" value={`${Number(reception.dispatched_quantity)} ${dispatch.product.unit_of_measure}`} /><Field label="Cantidad recibida" value={`${Number(reception.received_quantity)} ${dispatch.product.unit_of_measure}`} /><Field label="Diferencia histórica" value={`${Number(reception.difference)} ${dispatch.product.unit_of_measure}`} /><Field label="Fecha de recepción" value={dateTime.format(new Date(reception.received_at))} /></section><section className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold">Observación de recepción</h2><p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{reception.observation ?? 'Sin observaciones'}</p><p className="mt-2 text-xs text-slate">La observación es información reportada y no atribuye responsabilidad.</p></section>{incident.status === 'OPEN' ? <form className="rounded-xl border border-red-200 bg-red-50 p-5" onSubmit={submit}><div className="flex gap-2"><CircleAlert className="size-5 shrink-0 text-red-700" /><div className="flex-1"><h2 className="text-sm font-semibold text-red-900">Cerrar incidencia</h2><p className="mt-1 text-xs text-red-800">Registra únicamente el resultado. La diferencia original no será modificada.</p><label className="mt-4 block"><span className="mb-1 block text-xs font-semibold">Resultado del cierre</span><textarea aria-label="Resultado del cierre" className="min-h-24 w-full rounded-lg border border-red-200 bg-white p-3 text-sm" minLength={2} maxLength={1000} required value={resolution} onChange={(event) => setResolution(event.target.value)} /></label>{mutation.isError ? <p className="mt-2 text-sm text-red-700">{mutation.error.message}</p> : null}<div className="mt-4 flex justify-end"><button className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Cerrando...' : 'Cerrar incidencia'}</button></div></div></div></form> : <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-sm font-semibold text-emerald-900">Resultado del cierre</h2><p className="mt-3 text-sm text-emerald-900">{incident.resolution}</p><p className="mt-3 text-xs text-emerald-800">Cerrada por {incident.closed_by_user?.full_name} el {incident.closed_at ? dateTime.format(new Date(incident.closed_at)) : '—'}.</p></section>}</div>
}
