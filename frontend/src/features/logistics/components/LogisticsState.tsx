import { AlertCircle, LoaderCircle } from 'lucide-react'

export function LogisticsState({ onRetry }: { onRetry?: () => void }) {
  return <div className="grid min-h-64 place-items-center rounded-xl border border-border-subtle bg-white p-8 text-center shadow-sm">{onRetry ? <div><AlertCircle className="mx-auto size-7 text-red-500" /><h2 className="mt-3 text-sm font-semibold text-ink">No se pudo cargar Logística</h2><button className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white" type="button" onClick={onRetry}>Reintentar</button></div> : <div><LoaderCircle className="mx-auto size-7 animate-spin text-primary" /><p className="mt-3 text-sm text-slate">Cargando logística...</p></div>}</div>
}
