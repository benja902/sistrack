import type { InventoryExistenceApi } from '@/features/inventory/types/inventory.types'

export type RequestStatus =
  | 'REQUESTED'
  | 'AVAILABILITY_CONFIRMED'
  | 'PAID'
  | 'AUTHORIZED'

export type ReceiptStatus = 'PENDING' | 'REGISTERED'

export type RequestUser = {
  id: string
  full_name: string
}

export type InventoryReservation = {
  id: string
  quantity: number
  status: 'ACTIVE' | 'RELEASED'
  created_at: string
  released_at: string | null
}

export type GuineaPigRequest = {
  id: string
  request_code: string
  inventory_balance: InventoryExistenceApi
  customer_name: string
  requested_quantity: number
  requested_for: string
  status: RequestStatus
  receipt_status: ReceiptStatus
  receipt_reference: string | null
  created_by_user: RequestUser
  authorized_by_user: RequestUser | null
  paid_at: string | null
  authorized_at: string | null
  created_at: string
  updated_at: string
  reservation: InventoryReservation | null
}

export type GuineaPigRequestCreate = {
  inventory_balance_id: string
  customer_name: string
  requested_quantity: number
  requested_for: string
}
