import { ArrowLeft, BadgeCheck, Building2, GitBranch, LockKeyhole, Package, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { NotFoundPage } from '@/pages/NotFoundPage'
import { ApiError } from '@/services/http'

import { ProductionRequestState } from '../components/ProductionRequestState'
import { ProductionStatusBadge } from '../components/ProductionStatusBadge'
import { toProductionDetail } from '../data/production.mapper'
import { useMilkProduction } from '../queries/production.queries'

export function ProductionDetailPage() {
  const { productionId = '' } = useParams()
  const productionQuery = useMilkProduction(productionId)

  if (productionQuery.isPending) {
    return <ProductionRequestState state="loading" />
  }
  if (productionQuery.error instanceof ApiError && productionQuery.error.status === 404) {
    return <NotFoundPage />
  }
  if (productionQuery.isError) {
    return <ProductionRequestState state="error" onRetry={() => productionQuery.refetch()} />
  }

  const production = toProductionDetail(productionQuery.data)

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
      <div className="flex items-center justify-between text-xs text-slate">
        <nav className="flex items-center gap-2" aria-label="Ruta de navegación">
          <Link className="transition-colors hover:text-primary" to="/produccion">Producción</Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-ink">Detalle</span>
        </nav>
        <Link className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-primary" to="/produccion">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a producción
        </Link>
      </div>

      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-ink">Detalle de producción</h1>
            <span className="rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">{production.lotCode}</span>
            <ProductionStatusBadge status={production.status} />
          </div>
          <p className="mt-1 text-xs text-slate">Registro auditable de producción y generación del lote inicial.</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate md:self-auto">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Solo lectura
        </span>
      </section>

      <section className="relative overflow-hidden rounded-xl border border-border-subtle bg-white p-6 shadow-sm" aria-label="Resumen de la producción">
        <span className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6 lg:divide-x lg:divide-slate-100">
          <div className="lg:pr-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Centro</dt><dd className="mt-1.5 flex items-center gap-1.5 font-bold text-ink"><Building2 className="size-[18px] text-primary" aria-hidden="true" />{production.center}</dd></div>
          <div className="lg:px-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Fecha producción</dt><dd className="mt-1.5 font-bold text-ink">{production.date}</dd></div>
          <div className="lg:px-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Responsable</dt><dd className="mt-1.5 flex items-center gap-1.5 font-bold text-ink"><UserRound className="size-[18px] text-slate" aria-hidden="true" />{production.responsible}</dd></div>
          <div className="lg:px-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Producción total</dt><dd className="mt-0.5 text-[28px] font-bold leading-tight text-ink">{production.quantity.toFixed(1)} <span className="text-sm text-slate">{production.unit}</span></dd></div>
          <div className="lg:px-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Lote generado</dt><dd className="mt-2 break-all font-mono text-xs font-bold text-primary">{production.lotCode}</dd></div>
          <div className="lg:pl-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Estado</dt><dd className="mt-2"><ProductionStatusBadge status={production.status} /></dd></div>
        </dl>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm lg:col-span-7" aria-labelledby="production-detail-title">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div><h2 id="production-detail-title" className="text-sm font-bold text-ink">Detalle por vaca</h2><p className="mt-0.5 text-xs text-slate">Registro de litros que conforman la producción total.</p></div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{production.detailItems.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs text-ink">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate"><tr><th className="px-6 py-3.5">Identificador</th><th className="px-6 py-3.5 text-right">Litros producidos</th><th className="px-6 py-3.5 text-right">Estado</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {production.detailItems.map((item) => <tr key={item.id}><td className="flex items-center gap-2 px-6 py-4 font-medium"><span className="grid size-6 place-items-center rounded bg-slate-100 text-[11px] font-semibold text-slate-600">{item.id}</span>{item.label}</td><td className="px-6 py-4 text-right text-sm font-bold">{item.quantity.toFixed(1)} L</td><td className="px-6 py-4 text-right"><span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{item.status}</span></td></tr>)}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold"><tr><td className="px-6 py-3.5 uppercase tracking-wide">Total</td><td className="px-6 py-3.5 text-right text-sm">{production.quantity.toFixed(1)} L</td><td className="px-6 py-3.5 text-right text-[11px] font-normal text-slate">{production.detailItems.length} vacas registradas</td></tr></tfoot>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm" aria-labelledby="traceability-origin-title">
            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/80 px-5 py-4">
              <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-primary text-white"><Package className="size-[17px]" aria-hidden="true" /></span><div><h2 id="traceability-origin-title" className="text-sm font-bold text-ink">Lote generado</h2><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate">Trazabilidad de origen</p></div></div>
              <BadgeCheck className="size-[18px] text-primary" aria-hidden="true" />
            </div>
            <dl className="space-y-3 p-5 text-xs">
              <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5"><dt className="text-slate">Código de lote</dt><dd className="break-all text-right font-mono font-bold text-primary">{production.lotCode}</dd></div>
              <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5"><dt className="text-slate">Producto</dt><dd className="font-semibold text-ink">{production.product}</dd></div>
              <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5"><dt className="text-slate">Cantidad inicial</dt><dd className="font-bold text-ink">{production.quantity.toFixed(1)} {production.unit}</dd></div>
              <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5"><dt className="text-slate">Origen</dt><dd className="font-semibold text-ink">{production.center}</dd></div>
              <div className="flex justify-between gap-4 py-1.5"><dt className="text-slate">Evento inicial</dt><dd className="font-semibold text-ink">{production.event}</dd></div>
            </dl>
            <div className="px-5 pb-5"><Link className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary" to={`/trazabilidad?lote=${production.lotCode}`}><GitBranch className="size-4" aria-hidden="true" />Ver trazabilidad del lote</Link></div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm" aria-labelledby="record-info-title">
            <div className="flex items-center gap-2 border-b border-slate-100 p-5"><span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-700"><BadgeCheck className="size-[17px]" aria-hidden="true" /></span><div><h2 id="record-info-title" className="text-sm font-bold text-ink">Información del registro</h2><p className="text-[11px] text-slate">Metadatos de auditoría</p></div></div>
            <dl className="space-y-3 p-5 text-xs">
              <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5"><dt className="text-slate">Fecha de producción</dt><dd className="font-medium text-ink">{production.date}</dd></div>
              <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5"><dt className="text-slate">Fecha de registro</dt><dd className="font-medium text-ink">{production.registeredAt}</dd></div>
              <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5"><dt className="text-slate">Responsable</dt><dd className="font-semibold text-ink">{production.responsible}</dd></div>
              <div className="flex justify-between gap-4 py-1.5"><dt className="text-slate">Centro</dt><dd className="font-medium text-ink">{production.center}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
