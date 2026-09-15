import { Check } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { RequestStatus } from '../types/request.types'

const steps: RequestStatus[] = ['REQUESTED', 'AVAILABILITY_CONFIRMED', 'PAID', 'AUTHORIZED']
const statusLabels: Record<RequestStatus, string> = {
  REQUESTED: 'Solicitado',
  AVAILABILITY_CONFIRMED: 'Disponibilidad confirmada',
  PAID: 'Pagado',
  AUTHORIZED: 'Autorizado',
}

export function RequestWorkflow({ current }: { current: RequestStatus }) {
  const currentIndex = steps.indexOf(current)
  return (
    <ol className="grid gap-3 sm:grid-cols-4" aria-label="Flujo de la solicitud">
      {steps.map((step, index) => {
        const completed = index <= currentIndex
        return (
          <li key={step} className={cn('rounded-lg border p-3', completed ? 'border-primary/25 bg-blue-50/60' : 'border-slate-200 bg-slate-50')}>
            <span className={cn('grid size-6 place-items-center rounded-full text-xs font-bold', completed ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500')}>
              {index < currentIndex ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
            </span>
            <p className="mt-2 text-xs font-semibold text-ink">{statusLabels[step]}</p>
          </li>
        )
      })}
    </ol>
  )
}
