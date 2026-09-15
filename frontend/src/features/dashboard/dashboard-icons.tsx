import {
  Activity,
  Box,
  CheckCircle2,
  Droplets,
  ReceiptText,
  Truck,
  TriangleAlert,
} from 'lucide-react'

import type { DashboardIconName, StatusTone } from './dashboard.types'

const iconMap = {
  activity: Activity,
  box: Box,
  check: CheckCircle2,
  droplet: Droplets,
  receipt: ReceiptText,
  truck: Truck,
  warning: TriangleAlert,
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  error: 'bg-rose-50 text-rose-600',
  neutral: 'bg-blue-50 text-primary-container',
}

export function DashboardIcon({ icon, tone }: { icon: DashboardIconName; tone: StatusTone }) {
  const Icon = iconMap[icon]

  return (
    <span className={`grid size-8 place-items-center rounded-lg ${toneClasses[tone]}`}>
      <Icon className="size-[18px]" aria-hidden="true" />
    </span>
  )
}
