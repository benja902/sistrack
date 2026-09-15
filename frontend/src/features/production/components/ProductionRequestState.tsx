import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react'

type ProductionRequestStateProps = {
  state: 'loading' | 'error'
  onRetry?: () => void
}

export function ProductionRequestState({ state, onRetry }: ProductionRequestStateProps) {
  const loading = state === 'loading'
  const Icon = loading ? LoaderCircle : AlertCircle

  return (
    <section className="flex min-h-[360px] items-center justify-center rounded-xl border border-border-subtle bg-white px-6 py-16 text-center shadow-sm">
      <div className="flex max-w-sm flex-col items-center">
        <span className={`grid size-12 place-items-center rounded-xl ${loading ? 'bg-blue-50 text-primary' : 'bg-rose-50 text-rose-600'}`}>
          <Icon className={`size-6 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-bold text-ink">
          {loading ? 'Cargando producción' : 'No se pudo cargar la producción'}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-slate">
          {loading ? 'Consultando los registros disponibles.' : 'Comprueba la conexión con la API e inténtalo nuevamente.'}
        </p>
        {!loading && onRetry ? (
          <button className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary-container px-4 text-xs font-semibold text-white" type="button" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
        ) : null}
      </div>
    </section>
  )
}
