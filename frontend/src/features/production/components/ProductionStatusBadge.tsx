import { CheckCircle2 } from 'lucide-react'

import type { ProductionStatus } from '../types/production.types'

export function ProductionStatusBadge({ status }: { status: ProductionStatus }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      <CheckCircle2 className="size-3" aria-hidden="true" />
      {status}
    </span>
  )
}
