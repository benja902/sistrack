export type DashboardCenter = 'Todos los centros' | 'Kotosh' | 'Canchán'

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral'

export type DashboardIconName =
  | 'activity'
  | 'box'
  | 'check'
  | 'droplet'
  | 'receipt'
  | 'truck'
  | 'warning'

export type SummaryCardData = {
  id: string
  eyebrow: string
  title: string
  value: string
  unit: string
  detail: string
  status: string
  tone: StatusTone
  icon: DashboardIconName
}

export type MilkProductionDatum = {
  day: string
  value: number
  current?: boolean
}

export type InventorySegment = {
  label: string
  value: number
  color: string
}

export type InventoryStat = {
  label: string
  value: string
  tone?: StatusTone
}

export type RecentActivityItem = {
  id: string
  title: string
  productLine: string
  dateTime: string
  status: string
  tone: StatusTone
  icon: DashboardIconName
}

export type DashboardMockData = {
  summaryCards: SummaryCardData[]
  milkProduction: {
    title: string
    description: string
    periodLabel: string
    totalLabel: string
    totalValue: string
    data: MilkProductionDatum[]
  }
  inventory: {
    title: string
    description: string
    categoryLabel: string
    totalLabel: string
    totalValue: string
    segments: InventorySegment[]
    stats: InventoryStat[]
  }
  activities: RecentActivityItem[]
}
