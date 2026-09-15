import { GitBranch } from 'lucide-react'
import { Link } from 'react-router-dom'

type InventoryPageHeaderProps = {
  description: string
}

export function InventoryPageHeader({ description }: InventoryPageHeaderProps) {
  return (
    <section className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm md:flex-row md:items-center">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Inventario de cuyes</h1>
        <p className="mt-1 text-xs text-slate">{description}</p>
      </div>
      <Link
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 text-xs font-semibold text-ink shadow-sm transition-colors hover:bg-slate-50"
        to="/trazabilidad"
      >
        <GitBranch className="size-4 text-primary" aria-hidden="true" />
        Consultar trazabilidad
      </Link>
    </section>
  )
}

