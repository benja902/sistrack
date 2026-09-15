import { BarChart3, Donut } from 'lucide-react'
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

import type { DashboardMockData } from './dashboard.types'

type DashboardChartsProps = {
  milkProduction: DashboardMockData['milkProduction']
  inventory: DashboardMockData['inventory']
}

export function DashboardCharts({ inventory, milkProduction }: DashboardChartsProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
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

      <article className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-ink">{inventory.title}</h2>
            <p className="mt-0.5 text-xs text-slate">{inventory.description}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            <Donut className="size-3.5" aria-hidden="true" />
            {inventory.categoryLabel}
          </span>
        </div>
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
                <span className="block text-xs font-semibold uppercase leading-none text-slate">{inventory.totalLabel}</span>
                <strong className="mt-1 block text-lg leading-none text-ink">{inventory.totalValue}</strong>
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
      </article>
    </section>
  )
}
