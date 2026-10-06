import { AiAssistantPanel } from '@/features/ai/components/AiAssistantPanel'
import { AlertCircle, GitBranch, LoaderCircle, Search, UserRound } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import '@xyflow/react/dist/style.css'

import { TraceabilityMap } from '../components/TraceabilityMap'
import {
  areaStyles,
  eventArea,
  eventLabels,
} from '../components/traceability-map.config'
import { useTraceabilityEvents } from '../queries/traceability.queries'
import type { TraceabilityEvent } from '../types/traceability.types'

const centerCodes = { Kotosh: 'KOTOSH', Canchán: 'CANCHAN' } as const
const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

function metadataRows(event: TraceabilityEvent) {
  const ignored = new Set(['dispatch_id', 'reception_id'])
  return Object.entries(event.event_metadata ?? {}).filter(
    ([key, value]) => !ignored.has(key) && value !== null && typeof value !== 'object',
  )
}

export function TraceabilityPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const [params, setParams] = useSearchParams()
  const initialSearch = params.get('lote') ?? params.get('referencia') ?? ''
  const [input, setInput] = useState(initialSearch)
  const [search, setSearch] = useState(initialSearch)
  const [selected, setSelected] = useState<TraceabilityEvent | null>(null)
  const centerCode = selectedCenter === 'Todos los centros' ? undefined : centerCodes[selectedCenter]
  const query = useTraceabilityEvents(centerCode, search || undefined)

  useEffect(() => {
    if (!query.data?.length) {
      setSelected(null)
      return
    }
    setSelected((current) =>
      query.data.find((item) => item.id === current?.id) ?? query.data[query.data.length - 1],
    )
  }, [query.data])

  const areas = useMemo(() => [...new Set((query.data ?? []).map(eventArea))], [query.data])

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = input.trim()
    setSearch(value)
    setParams(value ? { referencia: value } : {})
  }

  function selectReference(value: string) {
    setInput(value)
    setSearch(value)
    setParams({ referencia: value })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mapa operativo interactivo</p>
          <h1 className="mt-1 text-2xl font-bold">Trazabilidad transdisciplinaria</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate">Explora cómo Producción, Inventario, Gestión comercial, Logística, Transporte, Punto de venta y Supervisión construyen un mismo historial.</p>
        </div>
        {query.data?.length ? <div className="flex flex-wrap gap-2">{areas.map((area) => <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider" key={area} style={{ background: areaStyles[area].soft, color: areaStyles[area].color }}>{areaStyles[area].label}</span>)}</div> : null}
      </header>

      <form className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm sm:flex-row" onSubmit={submit}>
        <label className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-slate" aria-hidden="true" /><input className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Ejemplo: LEC-KOT-20260711-001" value={input} onChange={(event) => setInput(event.target.value)} /></label>
        <button className="h-9 rounded-lg bg-primary px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-container" type="submit">Construir mapa</button>
      </form>

      {!search ? (
        <section className="grid min-h-[500px] place-items-center rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-sm">
          <div className="max-w-xl">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-primary"><GitBranch className="size-7" /></span>
            <h2 className="mt-4 text-lg font-bold">Selecciona una historia para construir el mapa</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate">Cada referencia conecta automáticamente los eventos generados por los diferentes módulos y actores.</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <button className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-xs text-primary transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => selectReference('LEC-KOT-20260711-001')} type="button"><strong className="block font-mono">LEC-KOT-20260711-001</strong><span className="mt-1 block text-blue-700">Leche con diferencia cerrada</span></button>
              <button className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800 transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => selectReference('DES-20260915-004')} type="button"><strong className="block font-mono">DES-20260915-004</strong><span className="mt-1 block">Cuyes actualmente en transporte</span></button>
            </div>
          </div>
        </section>
      ) : query.isPending ? (
        <section className="grid min-h-[500px] place-items-center rounded-2xl border border-border-subtle bg-white"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-primary" /><p className="mt-3 text-sm text-slate">Construyendo el mapa del recorrido...</p></div></section>
      ) : query.isError ? (
        <section className="grid min-h-[500px] place-items-center rounded-2xl border border-red-200 bg-white text-center"><div><AlertCircle className="mx-auto size-8 text-red-500" /><p className="mt-3 text-sm font-semibold">No se pudo consultar la trazabilidad.</p><button className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white" onClick={() => query.refetch()} type="button">Reintentar</button></div></section>
      ) : query.data.length === 0 ? (
        <section className="grid min-h-[500px] place-items-center rounded-2xl border border-border-subtle bg-white text-center"><div><GitBranch className="mx-auto size-10 text-slate-400" /><h2 className="mt-3 font-semibold">Sin eventos relacionados</h2><p className="mt-1 text-sm text-slate">Busca un lote, solicitud, despacho o incidencia.</p></div></section>
      ) : (
        <>
          <section className="grid gap-4 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Referencia consultada" value={search || 'Actividad reciente'} mono />
            <Summary label="Producto y centro" value={`${query.data[0].product?.name ?? 'Operación'} · ${query.data[0].center.name}`} />
            <Summary label="Eventos encontrados" value={`${query.data.length} eventos históricos`} />
            <Summary label="Áreas participantes" value={`${areas.length} disciplinas/áreas`} />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <TraceabilityMap events={query.data} selectedId={selected?.id ?? null} onSelect={setSelected} />
            <EventDetail event={selected} />
          </div>
          {selected ? <AiAssistantPanel contextType="traceability" contextId={selected.id} contextLabel={search} revision={query.dataUpdatedAt} explain /> : null}
          <p className="text-center text-xs text-slate">Arrastra el mapa, utiliza el zoom y selecciona cualquier evento para inspeccionar su evidencia.</p>
        </>
      )}
    </div>
  )
}

function Summary({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate">{label}</p><p className={`mt-1 text-sm font-bold ${mono ? 'font-mono text-primary' : 'text-ink'}`}>{value}</p></div>
}

function EventDetail({ event }: { event: TraceabilityEvent | null }) {
  if (!event) return <aside className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm" />
  const area = eventArea(event)
  return (
    <aside className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm xl:h-[590px] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: areaStyles[area].color }}>{areaStyles[area].label}</p><h2 className="mt-1 text-lg font-bold">{eventLabels[event.event_type] ?? event.event_type}</h2></div><span className="size-3 shrink-0 rounded-full" style={{ background: areaStyles[area].color }} /></div>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{event.description}</p>
      <dl className="mt-5 space-y-4 text-xs">
        <Detail label="Fecha y hora" value={dateTime.format(new Date(event.occurred_at))} />
        <Detail label="Módulo fuente" value={areaStyles[area].label} />
        <div><dt className="font-bold uppercase tracking-wider text-slate">Usuario registrador</dt><dd className="mt-1 inline-flex items-center gap-2 text-sm text-ink"><UserRound className="size-4 text-primary" />{event.recorded_by_user.full_name}</dd></div>
        <Detail label="Actor físico / custodia" value={event.operational_actor?.full_name ?? 'No corresponde a este evento'} />
        <Detail label="Centro y producto" value={`${event.center.name} · ${event.product?.name ?? 'Sin producto asociado'}`} />
      </dl>
      {metadataRows(event).length ? <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate">Datos del evento</h3><div className="mt-3 grid gap-2">{metadataRows(event).map(([key, value]) => <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs" key={key}><span className="text-slate">{key.replaceAll('_', ' ')}</span><strong className="text-right text-ink">{String(value)}</strong></div>)}</div></div> : null}
    </aside>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold uppercase tracking-wider text-slate">{label}</dt><dd className="mt-1 text-sm text-ink">{value}</dd></div>
}
