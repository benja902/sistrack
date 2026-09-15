import { CircleDot, ReceiptText } from 'lucide-react'

import { DashboardIcon } from './dashboard-icons'
import { StatusBadge } from './StatusBadge'
import type { RecentActivityItem } from './dashboard.types'

export function RecentActivity({ activities }: { activities: RecentActivityItem[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-primary-container">
            <ReceiptText className="size-[17px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Actividad reciente</h2>
            <p className="mt-0.5 text-xs text-slate">Registro de trazabilidad y eventos auditables</p>
          </div>
        </div>
        <span className="hidden items-center gap-2 text-xs font-medium text-slate sm:inline-flex">
          <CircleDot className="size-3 text-emerald-500" aria-hidden="true" />
          Actualizado en tiempo real
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">
            <tr>
              <th className="px-6 py-3" scope="col">Actividad</th>
              <th className="px-6 py-3" scope="col">Línea de producto</th>
              <th className="px-6 py-3" scope="col">Fecha y hora</th>
              <th className="px-6 py-3 text-right" scope="col">Estado auditable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-ink">
            {activities.map((activity) => (
              <tr key={activity.id} className="transition-colors hover:bg-slate-50/60">
                <td className="px-6 py-3.5 font-medium">
                  <span className="flex items-center gap-3">
                    <DashboardIcon icon={activity.icon} tone={activity.tone} />
                    {activity.title}
                  </span>
                </td>
                <td className="px-6 py-3.5 font-medium text-slate-700">{activity.productLine}</td>
                <td className="px-6 py-3.5 text-slate">{activity.dateTime}</td>
                <td className="px-6 py-3.5 text-right">
                  <StatusBadge label={activity.status} tone={activity.tone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
