import { cn } from '@/utils/cn'

import type { IncidentStatus } from '../types/incident.types'

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={cn(
      'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold',
      status === 'OPEN'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700',
    )}>
      {status === 'OPEN' ? 'Abierta' : 'Cerrada'}
    </span>
  )
}
