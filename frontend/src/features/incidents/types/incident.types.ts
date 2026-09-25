export type IncidentStatus = 'OPEN' | 'CLOSED'

export type Incident = {
  id: string
  incident_code: string
  status: IncidentStatus
  resolution: string | null
  created_at: string
  closed_at: string | null
  closed_by_user: { id: string; full_name: string } | null
  reception: {
    id: string
    dispatched_quantity: string | number
    received_quantity: string | number
    difference: string | number
    observation: string | null
    received_at: string
    dispatch: {
      id: string
      dispatch_code: string
      source_code: string
      destination: string
      center: { id: string; code: string; name: string }
      product: { id: string; sku: string; name: string; unit_of_measure: string }
    }
  }
}
