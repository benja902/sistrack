export type LogisticsSourceType = 'MILK_PRODUCTION' | 'GUINEA_PIG_REQUEST'
export type DeliveryMode = 'DIRECT_PICKUP' | 'DRIVER'
export type DispatchStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED'
export type ReceptionStatus = 'CONFORMING' | 'WITH_DIFFERENCE'

export type LogisticsUser = { id: string; full_name: string }

export type LogisticsReception = {
  id: string
  dispatched_quantity: string | number
  received_quantity: string | number
  difference: string | number
  status: ReceptionStatus
  observation: string | null
  received_by_user: LogisticsUser
  received_at: string
  created_at: string
}

export type LogisticsDispatch = {
  id: string
  dispatch_code: string
  source_type: LogisticsSourceType
  source_code: string
  milk_production_id: string | null
  guinea_pig_request_id: string | null
  center: { id: string; code: string; name: string }
  product: { id: string; sku: string; name: string; unit_of_measure: string }
  quantity: string | number
  unit_of_measure: string
  destination: string
  delivery_mode: DeliveryMode
  driver_actor: { id: string; full_name: string } | null
  status: DispatchStatus
  created_by_user: LogisticsUser
  dispatched_by_user: LogisticsUser | null
  dispatched_at: string | null
  created_at: string
  reception: LogisticsReception | null
}

export type DispatchCreate = {
  source_type: LogisticsSourceType
  source_id: string
  destination: string
  delivery_mode: DeliveryMode
  driver_name?: string
}

export type ReceptionCreate = {
  received_quantity: number
  received_at: string
  observation?: string
}
