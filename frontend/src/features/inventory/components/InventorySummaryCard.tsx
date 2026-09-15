import type { LucideIcon } from 'lucide-react'

import { cn } from '@/utils/cn'

type InventorySummaryCardProps = {
  eyebrow: string
  title: string
  value: number
  icon: LucideIcon
  tone?: 'primary' | 'warning' | 'success'
}

const toneStyles = {
  primary: { bar: 'bg-primary', icon: 'bg-blue-50 text-primary', value: 'text-ink' },
  warning: { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600', value: 'text-amber-700' },
  success: { bar: 'bg-emerald-600', icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
}

export function InventorySummaryCard({
  eyebrow,
  title,
  value,
  icon: Icon,
  tone = 'primary',
}: InventorySummaryCardProps) {
  const styles = toneStyles[tone]

  return (
    <article className="relative overflow-hidden rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className={cn('absolute inset-x-0 top-0 h-1', styles.bar)} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">{eyebrow}</p>
          <h2 className="mt-1 text-xs font-medium text-slate">{title}</h2>
        </div>
        <div className={cn('grid size-8 place-items-center rounded-lg', styles.icon)}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <strong className={cn('text-2xl tracking-tight', styles.value)}>{value}</strong>
        <span className="text-xs font-medium text-slate">ejemplares</span>
      </div>
    </article>
  )
}

