export type TraceabilityEvent = {
  id: string
  event_type: string
  occurred_at: string
  recorded_at: string
  reference_type: string | null
  reference_id: string | null
  description: string
  event_metadata: Record<string, unknown> | null
  recorded_by_user: { id: string; full_name: string }
  operational_actor: { id: string; full_name: string } | null
  center: { id: string; code: string; name: string }
  product: { id: string; sku: string; name: string; unit_of_measure: string } | null
}
