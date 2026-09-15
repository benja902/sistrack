import { BarChart3, Droplets, GitBranch, PackageCheck } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import { ProductionChart } from '../components/ProductionChart'
import { ProductionEmptyState } from '../components/ProductionEmptyState'
import { ProductionRecords } from '../components/ProductionRecords'
import { ProductionRequestState } from '../components/ProductionRequestState'
import { ProductionSummaryCard } from '../components/ProductionSummaryCard'
import { toProductionListData } from '../data/production.mapper'
import { useMilkProductions } from '../queries/production.queries'

const centerCodes = {
  Kotosh: 'KOTOSH',
  Canchán: 'CANCHAN',
} as const

export function ProductionListPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()
  const centerCode = selectedCenter === 'Todos los centros' ? undefined : centerCodes[selectedCenter]
  const productionQuery = useMilkProductions(centerCode)
  const data = productionQuery.data
    ? toProductionListData(productionQuery.data, selectedCenter)
    : undefined

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Producción</h1>
          <p className="mt-1 text-xs text-slate">Consulta y seguimiento de la producción registrada.</p>
        </div>
        {data && data.records.length > 0 ? (
          <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-ink shadow-sm transition-colors hover:bg-slate-50" to="/trazabilidad">
            <GitBranch className="size-4 text-primary" aria-hidden="true" />
            Consultar trazabilidad
          </Link>
        ) : null}
      </section>

      {productionQuery.isPending ? (
        <ProductionRequestState state="loading" />
      ) : productionQuery.isError ? (
        <ProductionRequestState state="error" onRetry={() => productionQuery.refetch()} />
      ) : !data || data.records.length === 0 ? (
        <ProductionEmptyState center={selectedCenter} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3" aria-label="Resumen de producción">
            <ProductionSummaryCard
              eyebrow="Producción diaria"
              title="Producción de leche hoy"
              value={data.summary.todayQuantity.toFixed(1)}
              unit="L"
              detail="Registrado hoy"
              status="Al día"
              icon={Droplets}
            />
            <ProductionSummaryCard
              eyebrow="Acumulado reciente"
              title="Producción últimos 7 días"
              value={data.summary.weeklyQuantity.toFixed(1)}
              unit="L"
              detail={`Promedio diario: ${data.summary.dailyAverage.toFixed(1)} L`}
              icon={BarChart3}
            />
            <ProductionSummaryCard
              eyebrow="Control de lotes"
              title="Lotes generados"
              value={String(data.summary.generatedLots)}
              unit="lotes trazables"
              detail="Últimos 7 días"
              icon={PackageCheck}
              tone="success"
            />
          </section>

          <ProductionChart centerLabel={data.centerLabel} data={data.chart} total={data.summary.weeklyQuantity} />
          <ProductionRecords records={data.records} />
        </>
      )}
    </div>
  )
}
