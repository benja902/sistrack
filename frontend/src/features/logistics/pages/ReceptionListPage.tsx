import { Inbox } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import { LogisticsState } from '../components/LogisticsState'
import { ReceptionStatusBadge } from '../components/LogisticsStatusBadge'
import { LogisticsTabs } from '../components/LogisticsTabs'
import { useReceptions } from '../queries/logistics.queries'

const centerCodes = { Kotosh: 'KOTOSH', Canchán: 'CANCHAN' } as const

export function ReceptionListPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const centerCode = selectedCenter === 'Todos los centros' ? undefined : centerCodes[selectedCenter]
  const query = useReceptions(centerCode)
  if (query.isPending) return <LogisticsState />
  if (query.isError) return <LogisticsState onRetry={() => query.refetch()} />
  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6"><header><p className="text-xs font-semibold uppercase tracking-wider text-primary">Punto de venta</p><h1 className="mt-1 text-2xl font-bold">Logística</h1><p className="mt-1 text-sm text-slate">Recepciones vinculadas a despachos con conductor.</p></header><LogisticsTabs />{query.data.length === 0 ? <section className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8 text-center"><div><Inbox className="mx-auto size-8 text-slate-400" /><h2 className="mt-3 text-base font-semibold">Sin recepciones</h2><p className="mt-1 text-sm text-slate">No existen despachos enviados para el centro seleccionado.</p></div></section> : <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="border-b bg-slate-50 text-[11px] uppercase tracking-wider text-slate"><tr><th className="px-5 py-3">Despacho</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Despachado</th><th className="px-4 py-3 text-right">Recibido</th><th className="px-4 py-3 text-right">Diferencia</th><th className="px-4 py-3">Estado</th><th className="px-5 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y">{query.data.map((dispatch) => <tr key={dispatch.id}><td className="px-5 py-4 font-mono font-semibold text-primary">{dispatch.dispatch_code}</td><td className="px-4 py-4">{dispatch.product.name}</td><td className="px-4 py-4 text-right font-bold">{Number(dispatch.quantity)}</td><td className="px-4 py-4 text-right">{dispatch.reception ? Number(dispatch.reception.received_quantity) : '—'}</td><td className="px-4 py-4 text-right font-semibold">{dispatch.reception ? Number(dispatch.reception.difference) : '—'}</td><td className="px-4 py-4"><ReceptionStatusBadge status={dispatch.reception?.status} /></td><td className="px-5 py-4 text-right"><Link className="font-semibold text-primary hover:underline" to={`/logistica/recepciones/${dispatch.id}`}>{dispatch.reception ? 'Ver detalle' : 'Registrar'}</Link></td></tr>)}</tbody></table></div></section>}</div>
}
