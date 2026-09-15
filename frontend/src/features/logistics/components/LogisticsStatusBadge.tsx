import { cn } from '@/utils/cn'

import type { DispatchStatus, ReceptionStatus } from '../types/logistics.types'

const dispatchLabels: Record<DispatchStatus, string> = { PENDING: 'Pendiente de salida', IN_TRANSIT: 'En transporte', COMPLETED: 'Completado' }
const dispatchStyles: Record<DispatchStatus, string> = { PENDING: 'border-amber-200 bg-amber-50 text-amber-700', IN_TRANSIT: 'border-blue-200 bg-blue-50 text-blue-700', COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700' }

export function DispatchStatusBadge({ status }: { status: DispatchStatus }) {
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold', dispatchStyles[status])}>{dispatchLabels[status]}</span>
}

export function ReceptionStatusBadge({ status }: { status?: ReceptionStatus }) {
  if (!status) return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate">Pendiente</span>
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold', status === 'CONFORMING' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700')}>{status === 'CONFORMING' ? 'Conforme' : 'Con diferencia'}</span>
}
