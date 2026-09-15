import { AlertCircle, LoaderCircle } from 'lucide-react'

type InventoryRequestStateProps = {
  state: 'loading' | 'error'
  onRetry?: () => void
}

export function InventoryRequestState({ state, onRetry }: InventoryRequestStateProps) {
  if (state === 'loading') {
    return (
      <div className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8 text-center shadow-sm">
        <div>
          <LoaderCircle className="mx-auto size-7 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8 text-center shadow-sm">
      <div>
        <AlertCircle className="mx-auto size-7 text-red-500" aria-hidden="true" />
        <h2 className="mt-3 text-sm font-semibold text-ink">No se pudo cargar el inventario</h2>
        <p className="mt-1 text-xs text-slate">Verifica la conexión con la API e inténtalo nuevamente.</p>
        {onRetry ? (
          <button className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white" type="button" onClick={onRetry}>
            Reintentar
          </button>
        ) : null}
      </div>
    </div>
  )
}

