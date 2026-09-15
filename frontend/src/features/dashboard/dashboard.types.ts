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
  /** Percentage (0-100) for the donut chart. */
  value: number
  /** Absolute count — shown in legend when present. */
  count?: number
  color: string
}

export type InventoryStat = {
  label: string
  value: string
  tone?: StatusTone
}

/** Per-category availability breakdown (right panel for Canchán). */
export type InventoryGroupRow = {
  label: string
  total: number
  available: number
  reserved: number
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

export type MilkProductionData = {
  title: string
  description: string
  periodLabel: string
  totalLabel: string
  totalValue: string
  data: MilkProductionDatum[]
}

export type InventoryData = {
  title: string
  description: string
  categoryLabel: string
  totalLabel: string
  totalValue: string
  segments: InventorySegment[]
  /**
   * Summary stats shown below the donut (Kotosh / Todos).
   * When null, the right panel renders the InventoryStatusPanel instead.
   */
  stats: InventoryStat[] | null
  /**
   * Detailed per-category breakdown used by InventoryStatusPanel (Canchán).
   * When null, the regular stats bar is used.
   */
  groups: InventoryGroupRow[] | null
}

export type DashboardMockData = {
  summaryCards: SummaryCardData[]
  /** Null when the selected center has no milk production (e.g. Canchán). */
  milkProduction: MilkProductionData | null
  inventory: InventoryData
  activities: RecentActivityItem[]
}
