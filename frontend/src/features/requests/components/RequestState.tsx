import { AlertCircle, LoaderCircle } from 'lucide-react'

export function RequestState({ onRetry }: { onRetry?: () => void }) {
  if (!onRetry) {
    return (
      <div className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-7 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate">Cargando solicitudes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8">
      <div className="text-center">
        <AlertCircle className="mx-auto size-7 text-red-500" aria-hidden="true" />
        <h2 className="mt-3 text-sm font-semibold text-ink">No se pudieron cargar las solicitudes</h2>
        <p className="mt-1 text-xs text-slate">Verifica la conexión e inténtalo nuevamente.</p>
        <button className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white" type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </div>
  )
}
