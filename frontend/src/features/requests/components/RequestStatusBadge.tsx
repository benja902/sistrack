import { cn } from '@/utils/cn'

import type { ReceiptStatus, RequestStatus } from '../types/request.types'

const statusLabels: Record<RequestStatus, string> = {
  REQUESTED: 'Solicitado',
  AVAILABILITY_CONFIRMED: 'Disponibilidad confirmada',
  PAID: 'Pagado',
  AUTHORIZED: 'Autorizado',
}

const statusStyles: Record<RequestStatus, string> = {
  REQUESTED: 'border-slate-200 bg-slate-50 text-slate-700',
  AVAILABILITY_CONFIRMED: 'border-blue-200 bg-blue-50 text-blue-700',
  PAID: 'border-amber-200 bg-amber-50 text-amber-700',
  AUTHORIZED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold', statusStyles[status])}>
      {statusLabels[status]}
    </span>
  )
}

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  return (
    <span className={cn(
      'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold',
      status === 'REGISTERED'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-50 text-slate-600',
    )}>
      {status === 'REGISTERED' ? 'Registrada' : 'Pendiente'}
    </span>
  )
}
