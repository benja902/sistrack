import type { Center } from '@/components/layout/TopBar'

import type {
  MilkProductionApi,
  MilkProductionDetailApi,
  ProductionChartPoint,
  ProductionListData,
  ProductionRecord,
} from '../types/production.types'

const dayFormatter = new Intl.DateTimeFormat('es-PE', { weekday: 'short' })

function dateParts(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function toRecord(production: MilkProductionApi): ProductionRecord {
  return {
    id: production.id,
    date: formatDate(production.production_date),
    registeredAt: formatDateTime(production.created_at),
    center: production.center.name,
    product: production.product.name,
    quantity: Number(production.total_liters),
    unit: production.product.unit_of_measure,
    responsible: production.responsible_actor?.full_name ?? production.responsible,
    registeredBy: production.registered_by.full_name,
    status: 'Registrada',
    event: 'Producción registrada',
    lotCode: production.lot_code,
    detailItems: [],
  }
}

function buildWeeklyChart(productions: MilkProductionApi[]): ProductionChartPoint[] {
  const quantities = new Map<string, number>()
  productions.forEach((production) => {
    quantities.set(
      production.production_date,
      (quantities.get(production.production_date) ?? 0) + Number(production.total_liters),
    )
  })

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const key = dateParts(date)
    return {
      day: index === 6
        ? 'Hoy'
        : dayFormatter.format(date).replace('.', '').replace(/^./, (letter) => letter.toUpperCase()),
      quantity: quantities.get(key) ?? 0,
      isCurrent: index === 6,
    }
  })
}

export function toProductionListData(
  productions: MilkProductionApi[],
  selectedCenter: Center,
): ProductionListData {
  const chart = buildWeeklyChart(productions)
  const weeklyQuantity = chart.reduce((total, point) => total + point.quantity, 0)
  const todayKey = dateParts(new Date())
  const weeklyDateKeys = new Set(Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - index)
    return dateParts(date)
  }))
  const todayQuantity = productions
    .filter((production) => production.production_date === todayKey)
    .reduce((total, production) => total + Number(production.total_liters), 0)
  const centerNames = [...new Set(productions.map((production) => production.center.name))]
  const centerLabel = selectedCenter === 'Todos los centros'
    ? centerNames.join(' y ') || 'Kotosh y Canchán'
    : selectedCenter

  return {
    centerLabel,
    records: productions.map(toRecord),
    chart,
    summary: {
      todayQuantity,
      weeklyQuantity,
      dailyAverage: Math.round((weeklyQuantity / 7) * 10) / 10,
      generatedLots: productions.filter((production) => weeklyDateKeys.has(production.production_date)).length,
    },
  }
}

export function toProductionDetail(production: MilkProductionDetailApi): ProductionRecord {
  return {
    ...toRecord(production),
    detailItems: production.details.map((detail, index) => ({
      id: String(index + 1).padStart(2, '0'),
      label: detail.animal_reference,
      quantity: Number(detail.liters),
      status: 'Registrado',
    })),
  }
}
