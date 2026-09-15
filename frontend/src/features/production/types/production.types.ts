export type ProductionCenter = 'Kotosh' | 'Canchán'

export type ProductionStatus = 'Registrada'

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
  registeredBy: string
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

export type ProductionCenterApi = {
  id: string
  code: string
  name: ProductionCenter
}

export type ProductionProductApi = {
  id: string
  sku: 'LECHE'
  name: 'Leche'
  unit_of_measure: 'L'
}

export type MilkProductionApi = {
  id: string
  lot_code: string
  production_date: string
  responsible: string
  responsible_actor: {
    id: string
    full_name: string
  } | null
  total_liters: string | number
  registered_by_user_id: string
  registered_by: {
    id: string
    full_name: string
  }
  created_at: string
  center: ProductionCenterApi
  product: ProductionProductApi
}

export type MilkProductionDetailApi = MilkProductionApi & {
  details: Array<{
    id: string
    animal_reference: string
    liters: string | number
    created_at: string
  }>
}

export type MilkProductionCreate = {
  production_date: string
  center_id: string
  responsible_actor_id: string
  details: Array<{
    animal_reference: string
    liters: number
  }>
}
