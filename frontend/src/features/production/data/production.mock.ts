import type { Center } from '@/components/layout/TopBar'

import type {
  ProductionChartPoint,
  ProductionDetailItem,
  ProductionListData,
  ProductionRecord,
} from '../types/production.types'

const days = [
  { date: '2026-09-07', label: 'Lun' },
  { date: '2026-09-08', label: 'Mar' },
  { date: '2026-09-09', label: 'Mié' },
  { date: '2026-09-10', label: 'Jue' },
  { date: '2026-09-11', label: 'Vie' },
  { date: '2026-09-12', label: 'Sáb' },
  { date: '2026-09-13', label: 'Hoy' },
] as const

const kotoshQuantities = [20, 24, 21, 25, 23, 22, 22]

const responsibleByIndex = ['Vilma', 'Juan'] as const

function formatDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function createDetailItems(total: number): ProductionDetailItem[] {
  const first = total === 22 ? 7.5 : Math.round(total * 0.34 * 10) / 10
  const second = total === 22 ? 8 : Math.round(total * 0.36 * 10) / 10
  const third = Math.round((total - first - second) * 10) / 10

  return [first, second, third].map((quantity, index) => ({
    id: String(index + 1).padStart(2, '0'),
    label: `Vaca ${String(index + 1).padStart(2, '0')}`,
    quantity,
    status: 'Registrado' as const,
  }))
}

function createKotoshRecords(): ProductionRecord[] {
  return days.map(({ date }, index) => {
    const quantity = kotoshQuantities[index]
    const compactDate = date.replaceAll('-', '')
    const lotCode = `LEC-KOT-${compactDate}-01`

    return {
      id: lotCode.toLowerCase(),
      date: formatDate(date),
      registeredAt: `${formatDate(date)} (07:30)`,
      center: 'Kotosh',
      product: 'Leche',
      quantity,
      unit: 'L',
      responsible: responsibleByIndex[index % responsibleByIndex.length],
      status: 'Cerrado',
      event: 'Producción registrada',
      lotCode,
      detailItems: createDetailItems(quantity),
    }
  })
}

const kotoshRecords = createKotoshRecords()

function createKotoshChart(): ProductionChartPoint[] {
  return days.map(({ label }, index) => ({
    day: label,
    quantity: kotoshQuantities[index],
    isCurrent: index === days.length - 1,
  }))
}

export function getProductionListMock(selectedCenter: Center): ProductionListData {
  if (selectedCenter === 'Canchán') {
    return {
      centerLabel: 'Canchán',
      records: [],
      chart: [],
      summary: {
        todayQuantity: 0,
        weeklyQuantity: 0,
        dailyAverage: 0,
        generatedLots: 0,
      },
    }
  }

  const records = [...kotoshRecords].sort((left, right) => right.lotCode.localeCompare(left.lotCode))
  const chart = createKotoshChart()
  const weeklyQuantity = chart.reduce((total, point) => total + point.quantity, 0)

  return {
    centerLabel: 'Kotosh',
    records,
    chart,
    summary: {
      todayQuantity: chart.at(-1)?.quantity ?? 0,
      weeklyQuantity,
      dailyAverage: Math.round((weeklyQuantity / chart.length) * 10) / 10,
      generatedLots: records.length,
    },
  }
}

export function getProductionDetailMock(productionId: string) {
  return kotoshRecords.find((record) => record.id === productionId)
}
