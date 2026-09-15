export type ProductionCenter = 'Kotosh' | 'Canchán'

export type ProductionStatus = 'Cerrado'

export type ProductionEvent = 'Producción registrada'

export type ProductionDetailItem = {
  id: string
  label: string
  quantity: number
  status: 'Registrado'
}

export type ProductionRecord = {
  id: string
  date: string
  registeredAt: string
  center: ProductionCenter
  product: 'Leche'
  quantity: number
  unit: 'L'
  responsible: string
  status: ProductionStatus
  event: ProductionEvent
  lotCode: string
  detailItems: ProductionDetailItem[]
}

export type ProductionChartPoint = {
  day: string
  quantity: number
  isCurrent: boolean
}

export type ProductionSummary = {
  todayQuantity: number
  weeklyQuantity: number
  dailyAverage: number
  generatedLots: number
}

export type ProductionListData = {
  centerLabel: string
  records: ProductionRecord[]
  chart: ProductionChartPoint[]
  summary: ProductionSummary
}
