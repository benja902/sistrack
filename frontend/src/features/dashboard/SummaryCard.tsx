import { CheckCircle2 } from 'lucide-react'

import { DashboardIcon } from './dashboard-icons'
import type { SummaryCardData } from './dashboard.types'

const accentClasses = {
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  error: 'bg-rose-600',
  neutral: 'bg-primary-container',
}

export function SummaryCard({ card }: { card: SummaryCardData }) {
  return (
    <article className="relative flex min-h-48 flex-col justify-between overflow-hidden rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 ${accentClasses[card.tone]}`} />
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">{card.eyebrow}</span>
          <DashboardIcon icon={card.icon} tone={card.tone} />
        </div>
        <h2 className="mt-1 text-xs font-medium text-slate">{card.title}</h2>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold tracking-tight ${card.tone === 'error' ? 'text-rose-600' : 'text-ink'}`}>
            {card.value}
          </span>
          <span className="text-xs font-semibold text-slate">{card.unit}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate">{card.detail}</span>
        {card.tone === 'success' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            {card.status}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate">{card.status}</span>
        )}
      </div>
    </article>
  )
}
