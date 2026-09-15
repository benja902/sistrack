import { Activity, Boxes, Search, Truck, Warehouse } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'

import type { AdminLayoutContext } from '@/components/layout/AdminLayout'

import { DashboardCharts } from './DashboardCharts'
import { dashboardMockData } from './dashboard.mock'
import { RecentActivity } from './RecentActivity'
import { SummaryCard } from './SummaryCard'

const quickLinks = [
  { label: 'Ver inventario', path: '/inventario', icon: Warehouse },
  { label: 'Ver despachos', path: '/logistica', icon: Truck },
  { label: 'Ver incidencias', path: '/incidencias', icon: Boxes },
]

export function DashboardPage() {
  const { selectedCenter } = useOutletContext<AdminLayoutContext>()

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-ink">Resumen operativo</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <Activity className="size-3.5" aria-hidden="true" />
              Supervisión en vivo
            </span>
          </div>
          <p className="mt-1 text-xs text-slate">
            Vista general de producción, inventario, despachos e incidencias. Centro: {selectedCenter}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {quickLinks.map(({ icon: Icon, label, path }, index) => (
              <div key={path} className="flex items-center">
                {index > 0 ? <span className="text-slate-300" aria-hidden="true">|</span> : null}
                <Link
                  className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white hover:text-primary"
                  to={path}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </Link>
              </div>
            ))}
          </div>
          <Link
            className="flex h-9 items-center gap-2 rounded-lg bg-primary-container px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary"
            to="/trazabilidad"
          >
            <Search className="size-4" aria-hidden="true" />
            Consultar trazabilidad
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de indicadores">
        {dashboardMockData.summaryCards.map((card) => (
          <SummaryCard key={card.id} card={card} />
        ))}
      </section>

      <DashboardCharts
        milkProduction={dashboardMockData.milkProduction}
        inventory={dashboardMockData.inventory}
      />

      <RecentActivity activities={dashboardMockData.activities} />
    </div>
  )
}
