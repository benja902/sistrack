import { BarChart3, Scale } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import type { InventoryData, MilkProductionData } from './dashboard.types'

type DashboardChartsProps = {
  milkProduction: MilkProductionData | null
  inventory: InventoryData
}

// ---------------------------------------------------------------------------
// Right panel variant A — simple stats bar (Todos / Kotosh)
// ---------------------------------------------------------------------------
function InventoryStatsPanel({ inventory }: { inventory: InventoryData }) {
  return (
    <>
      {/* Donut chart */}
      <div className="flex flex-col items-center gap-6 py-2 sm:flex-row sm:items-center">
        <div className="relative size-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={inventory.segments}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={47}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
              >
                {inventory.segments.map((segment) => (
                  <Cell key={segment.label} fill={segment.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <span>
              <span className="block text-xs font-semibold uppercase leading-none text-slate">
                {inventory.totalLabel}
              </span>
              <strong className="mt-1 block text-lg leading-none text-ink">
                {inventory.totalValue}
              </strong>
            </span>
          </div>
        </div>
        <div className="grid w-full gap-2 text-xs">
          {inventory.segments.map((segment) => (
            <div
              key={segment.label}
              className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 p-1.5"
            >
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
              <strong className="text-ink">{segment.value}%</strong>
            </div>
          ))}
        </div>
      </div>
      {/* Stats summary row */}
      {inventory.stats ? (
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-100 pt-3 text-center text-xs">
          {inventory.stats.map((stat) => (
            <div key={stat.label} className="px-2">
              <span className="block text-[11px] text-slate">{stat.label}</span>
              <strong
                className={`mt-0.5 block text-sm ${
                  stat.tone === 'success'
                    ? 'text-emerald-700'
                    : stat.tone === 'warning'
                      ? 'text-amber-700'
                      : 'text-ink'
                }`}
              >
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Right panel variant B — donut with absolute counts (left side, Canchán)
// ---------------------------------------------------------------------------
function InventoryGroupsPanel({ inventory }: { inventory: InventoryData }) {
  return (
    <>
      {/* Donut + legend with absolute counts */}
      <div className="flex flex-col items-center gap-6 py-2 sm:flex-row sm:items-center">
        <div className="relative size-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={inventory.segments}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={47}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
              >
                {inventory.segments.map((segment) => (
                  <Cell key={segment.label} fill={segment.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <span>
              <span className="block text-[10px] font-semibold uppercase leading-none text-slate">
                {inventory.totalLabel}
              </span>
              <strong className="mt-1 block text-xl leading-none text-ink">
                {inventory.totalValue}
              </strong>
            </span>
          </div>
        </div>
        {/* Legend with count + percentage */}
        <div className="grid w-full gap-2 text-xs">
          {inventory.segments.map((segment) => (
            <div
              key={segment.label}
              className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 p-2"
            >
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">{segment.count}</span>
                <strong className="w-10 text-right text-ink">{segment.value}%</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardCharts({ inventory, milkProduction }: DashboardChartsProps) {
  const hasGroups = inventory.groups !== null

  return (
    <section className={`grid gap-6 ${milkProduction ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
      {/* Left: Milk production chart (hidden for Canchán) */}
      {milkProduction ? (
        <article className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-ink">{milkProduction.title}</h2>
              <p className="mt-0.5 text-xs text-slate">{milkProduction.description}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              <BarChart3 className="size-3.5" aria-hidden="true" />
              {milkProduction.periodLabel}
            </span>
          </div>
          <div className="h-52 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={milkProduction.data} margin={{ top: 24, right: 4, left: 4, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#60758A', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis hide domain={[0, 'dataMax']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  <LabelList dataKey="value" position="top" formatter={(value) => `${value}L`} fill="#60758A" fontSize={11} />
                  {milkProduction.data.map((item) => (
                    <Cell key={item.day} fill={item.current ? '#0055C6' : '#CBD5E1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate">
            <span>{milkProduction.totalLabel}</span>
            <strong className="text-sm text-ink">{milkProduction.totalValue}</strong>
          </div>
        </article>
      ) : null}

      {/* Left for Canchán (no milk): Donut inventory with counts */}
      <article className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-ink">{inventory.title}</h2>
            <p className="mt-0.5 text-xs text-slate">{inventory.description}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {hasGroups ? (
              <Scale className="size-3.5" aria-hidden="true" />
            ) : (
              <BarChart3 className="size-3.5" aria-hidden="true" />
            )}
            {inventory.categoryLabel}
          </span>
        </div>
        {hasGroups ? (
          <InventoryGroupsPanel inventory={inventory} />
        ) : (
          <InventoryStatsPanel inventory={inventory} />
        )}
      </article>

      {/* Right panel: Estado del inventario — only shown for Canchán */}
      {hasGroups ? (
        <article className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-ink">Estado del inventario</h2>
              <p className="mt-0.5 text-xs text-slate">Disponibilidad física y reserva operativa</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              <Scale className="size-3.5" aria-hidden="true" />
              Balance
            </span>
          </div>
          {/* KPI bar */}
          {(() => {
            const groups = inventory.groups!
            const totalPhysical = groups.reduce((s, g) => s + g.total, 0)
            const totalReserved = groups.reduce((s, g) => s + g.reserved, 0)
            const totalAvailable = groups.reduce((s, g) => s + g.available, 0)
            return (
              <>
                <div className="mb-5 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-100 bg-slate-50 p-3 text-center text-xs">
                  <div className="px-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Existencia física
                    </span>
                    <span className="mt-0.5 block text-lg font-bold text-ink">
                      {totalPhysical.toLocaleString('es-PE')}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Reservado
                    </span>
                    <span className="mt-0.5 block text-lg font-bold text-amber-700">
                      {totalReserved.toLocaleString('es-PE')}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Disponible
                    </span>
                    <span className="mt-0.5 block text-lg font-bold text-emerald-700">
                      {totalAvailable.toLocaleString('es-PE')}
                    </span>
                  </div>
                </div>
                {/* Per-group progress bars */}
                <div className="space-y-3.5 text-xs">
                  {groups.map((group) => {
                    const availPct = group.total > 0 ? (group.available / group.total) * 100 : 0
                    const resPct = group.total > 0 ? (group.reserved / group.total) * 100 : 0
                    return (
                      <div key={group.label}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-slate-700">
                            {group.label}{' '}
                            <span className="font-normal text-slate-400">({group.total})</span>
                          </span>
                          <span className="text-[11px] text-slate-600">
                            <span className="font-bold text-emerald-700">{group.available} disp.</span>
                            {group.reserved > 0 ? (
                              <>
                                {' '}
                                /{' '}
                                <span className="font-medium text-amber-700">{group.reserved} res.</span>
                              </>
                            ) : (
                              <>
                                {' '}
                                / <span className="font-medium text-slate-400">0 res.</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full bg-emerald-500" style={{ width: `${availPct}%` }} />
                          {resPct > 0 && (
                            <div className="h-full bg-amber-400" style={{ width: `${resPct}%` }} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Disponible
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="size-2 rounded-full bg-amber-400" />
                      Reservado para despacho
                    </span>
                  </div>
                  <span className="font-bold text-ink">Total: {totalPhysical.toLocaleString('es-PE')}</span>
                </div>
              </>
            )
          })()}
        </article>
      ) : null}
    </section>
  )
}
