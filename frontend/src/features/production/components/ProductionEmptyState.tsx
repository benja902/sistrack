import { ClipboardX } from 'lucide-react'

import type { Center } from '@/components/layout/TopBar'

export function ProductionEmptyState({ center }: { center: Center }) {
  const message = center === 'Canchán'
    ? 'No existen registros de producción de leche para el centro Canchán.'
    : 'Aún no existen registros de producción de leche para el centro seleccionado.'

  return (
    <section
      className="flex min-h-[420px] items-center justify-center rounded-xl border border-border-subtle bg-white px-6 py-16 text-center shadow-sm"
      aria-labelledby="production-empty-title"
    >
      <div className="flex max-w-sm flex-col items-center">
        <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-primary">
          <ClipboardX className="size-6" aria-hidden="true" />
        </span>
        <h2 id="production-empty-title" className="mt-4 text-base font-bold text-ink">
          Sin registros de producción
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-slate">
          {message}
        </p>
      </div>
    </section>
  )
}
