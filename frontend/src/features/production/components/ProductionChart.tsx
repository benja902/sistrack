import { BarChart3, CalendarDays } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { ProductionChartPoint } from '../types/production.types'

type ProductionChartProps = {
  centerLabel: string
  data: ProductionChartPoint[]
  total: number
}

export function ProductionChart({ centerLabel, data, total }: ProductionChartProps) {
  return (
    <section className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:p-6" aria-labelledby="production-chart-title">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="production-chart-title" className="text-sm font-bold text-ink">Producción de leche — últimos 7 días</h2>
          <p className="mt-0.5 text-xs text-slate">Litros por día ({centerLabel})</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate">
          <span>Total: <strong className="font-bold text-ink">{total.toFixed(1)} L</strong></span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Semanal
          </span>
        </div>
      </div>

      <div className="h-56 w-full" aria-label={`Gráfico de producción de ${centerLabel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#E8EDF2" vertical={false} />
            <XAxis dataKey="day" axisLine={{ stroke: '#DDE4EA' }} tickLine={false} tick={{ fill: '#60758A', fontSize: 11 }} />
            <YAxis hide domain={[0, 'dataMax + 8']} />
            <Tooltip
              cursor={{ fill: '#F4F8FB' }}
              formatter={(value) => [`${Number(value).toFixed(1)} L`, 'Producción']}
              contentStyle={{ border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="quantity" radius={[4, 4, 0, 0]} maxBarSize={42}>
              {data.map((point) => (
                <Cell key={point.day} fill={point.isCurrent ? '#1C6DEF' : '#DDE4EA'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <span className="sr-only"><BarChart3 />Producción semanal expresada en litros</span>
    </section>
  )
}
