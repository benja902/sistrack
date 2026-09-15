import type { LucideIcon } from 'lucide-react'

type ProductionSummaryCardProps = {
  eyebrow: string
  title: string
  value: string
  unit?: string
  detail: string
  status?: string
  icon: LucideIcon
  tone?: 'primary' | 'success'
}

export function ProductionSummaryCard({
  eyebrow,
  title,
  value,
  unit,
  detail,
  status,
  icon: Icon,
  tone = 'primary',
}: ProductionSummaryCardProps) {
  const success = tone === 'success'

  return (
    <article className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 ${success ? 'bg-emerald-600' : 'bg-primary-container'}`} />
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">{eyebrow}</span>
          <span className={`grid size-8 place-items-center rounded-lg ${success ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-primary'}`}>
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        </div>
        <h2 className="mt-1 text-xs font-medium text-slate">{title}</h2>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-ink">{value}</span>
          {unit ? <span className="text-xs font-semibold text-slate">{unit}</span> : null}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate">{detail}</span>
        {status ? <span className="text-[11px] font-medium text-emerald-600">{status}</span> : null}
      </div>
    </article>
  )
}
