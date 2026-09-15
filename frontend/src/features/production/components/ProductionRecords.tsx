import { ArrowRight, Package, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { ProductionRecord } from '../types/production.types'
import { ProductionStatusBadge } from './ProductionStatusBadge'

const pageSize = 5

export function ProductionRecords({ records }: { records: ProductionRecord[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Todos' | 'Cerrado'>('Cerrado')
  const [page, setPage] = useState(0)

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')
    return records.filter((record) => {
      const matchesQuery = !normalizedQuery || record.lotCode.toLocaleLowerCase('es').includes(normalizedQuery)
      const matchesStatus = status === 'Todos' || record.status === status
      return matchesQuery && matchesStatus
    })
  }, [query, records, status])

  const maxPage = Math.max(0, Math.ceil(filteredRecords.length / pageSize) - 1)
  const currentPage = Math.min(page, maxPage)
  const visibleRecords = filteredRecords.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  const updateQuery = (value: string) => {
    setQuery(value)
    setPage(0)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm" aria-labelledby="production-records-title">
      <div className="flex items-center gap-2.5 border-b border-slate-100 p-5">
        <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-primary">
          <Package className="size-[17px]" aria-hidden="true" />
        </span>
        <div>
          <h2 id="production-records-title" className="text-sm font-bold text-ink">Registros de producción</h2>
          <p className="text-xs text-slate">Historial auditable de lotes generados</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">
          Estado:
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium normal-case tracking-normal text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as 'Todos' | 'Cerrado')
              setPage(0)
            }}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </label>

        <label className="relative w-full sm:w-64">
          <span className="sr-only">Buscar por código de lote</span>
          <Search className="absolute left-2.5 top-2 size-4 text-slate" aria-hidden="true" />
          <input
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-ink outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Buscar por código de lote..."
          />
        </label>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[850px] text-left text-xs text-ink">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">
            <tr>
              <th className="px-5 py-3" scope="col">Fecha</th>
              <th className="px-5 py-3" scope="col">Centro</th>
              <th className="px-5 py-3" scope="col">Producto</th>
              <th className="px-5 py-3" scope="col">Cantidad</th>
              <th className="px-5 py-3" scope="col">Responsable</th>
              <th className="px-5 py-3" scope="col">Estado / evento</th>
              <th className="px-5 py-3 text-right" scope="col">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRecords.map((record) => (
              <tr key={record.id} className="transition-colors hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-5 py-3.5 font-medium">{record.date}</td>
                <td className="px-5 py-3.5 text-slate-700">{record.center}</td>
                <td className="px-5 py-3.5 text-slate-700">{record.product}</td>
                <td className="whitespace-nowrap px-5 py-3.5 font-bold">{record.quantity.toFixed(1)} {record.unit}</td>
                <td className="px-5 py-3.5 text-slate-700">{record.responsible}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col items-start gap-1">
                    <ProductionStatusBadge status={record.status} />
                    <span className="text-[11px] text-slate">{record.event}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary-container" to={`/produccion/${record.id}`}>
                    Ver detalle
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {visibleRecords.map((record) => (
          <article className="space-y-3 p-4" key={record.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold text-primary">{record.lotCode}</p>
                <p className="mt-1 text-xs text-slate">{record.date} · {record.center}</p>
              </div>
              <ProductionStatusBadge status={record.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-slate">Producto</dt><dd className="mt-0.5 font-semibold text-ink">{record.product}</dd></div>
              <div><dt className="text-slate">Cantidad</dt><dd className="mt-0.5 font-bold text-ink">{record.quantity.toFixed(1)} {record.unit}</dd></div>
              <div><dt className="text-slate">Responsable</dt><dd className="mt-0.5 text-ink">{record.responsible}</dd></div>
              <div><dt className="text-slate">Evento</dt><dd className="mt-0.5 text-ink">{record.event}</dd></div>
            </dl>
            <Link className="inline-flex items-center gap-1 text-xs font-semibold text-primary" to={`/produccion/${record.id}`}>
              Ver detalle <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>

      {visibleRecords.length === 0 ? <p className="p-8 text-center text-sm text-slate">No se encontraron registros.</p> : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate">
        <span>Mostrando {visibleRecords.length} de {filteredRecords.length} registros</span>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >Anterior</button>
          <button
            className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={currentPage >= maxPage}
            onClick={() => setPage((value) => Math.min(maxPage, value + 1))}
          >Siguiente</button>
        </div>
      </div>
    </section>
  )
}
