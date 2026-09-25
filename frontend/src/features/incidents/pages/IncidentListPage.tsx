import { CircleAlert } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import { IncidentState } from '../components/IncidentState'
import { IncidentStatusBadge } from '../components/IncidentStatusBadge'
import { useIncidents } from '../queries/incidents.queries'

const centerCodes = { Kotosh: 'KOTOSH', Canchán: 'CANCHAN' } as const
const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

export function IncidentListPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const centerCode = selectedCenter === 'Todos los centros' ? undefined : centerCodes[selectedCenter]
  const query = useIncidents(centerCode)
  if (query.isPending) return <IncidentState />
  if (query.isError) return <IncidentState onRetry={() => query.refetch()} />

  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6"><header><p className="text-xs font-semibold uppercase tracking-wider text-primary">Diferencias de recepción</p><h1 className="mt-1 text-2xl font-bold">Incidencias</h1><p className="mt-1 text-sm text-slate">Consulta y cierre de diferencias cuantitativas detectadas automáticamente.</p></header>{query.data.length === 0 ? <section className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8 text-center"><div><CircleAlert className="mx-auto size-8 text-slate-400" /><h2 className="mt-3 text-base font-semibold">Sin incidencias</h2><p className="mt-1 text-sm text-slate">No existen diferencias para el centro seleccionado.</p></div></section> : <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b bg-slate-50 text-[11px] uppercase tracking-wider text-slate"><tr><th className="px-5 py-3">Fecha</th><th className="px-4 py-3">Código</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Diferencia</th><th className="px-4 py-3">Estado</th><th className="px-5 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y">{query.data.map((incident) => <tr key={incident.id}><td className="px-5 py-4 text-slate">{dateTime.format(new Date(incident.created_at))}</td><td className="px-4 py-4 font-mono font-semibold text-primary">{incident.incident_code}</td><td className="px-4 py-4">Recepción</td><td className="px-4 py-4 font-medium">{incident.reception.dispatch.dispatch_code}</td><td className="px-4 py-4">{incident.reception.dispatch.product.name}</td><td className="px-4 py-4 text-right font-bold text-red-700">{Number(incident.reception.difference)} {incident.reception.dispatch.product.unit_of_measure}</td><td className="px-4 py-4"><IncidentStatusBadge status={incident.status} /></td><td className="px-5 py-4 text-right"><Link className="font-semibold text-primary hover:underline" to={`/incidencias/${incident.id}`}>Ver detalle</Link></td></tr>)}</tbody></table></div></section>}</div>
}
