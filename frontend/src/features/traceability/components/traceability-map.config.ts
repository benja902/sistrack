import type { TraceabilityEvent } from '../types/traceability.types'

export type TraceabilityArea =
  | 'production'
  | 'inventory'
  | 'commercial'
  | 'logistics'
  | 'transport'
  | 'reception'
  | 'incident'

export const areaStyles: Record<TraceabilityArea, { color: string; soft: string; label: string }> = {
  production: { color: '#16a34a', soft: '#dcfce7', label: 'Producción' },
  inventory: { color: '#0f766e', soft: '#ccfbf1', label: 'Inventario' },
  commercial: { color: '#7c3aed', soft: '#ede9fe', label: 'Gestión comercial' },
  logistics: { color: '#2563eb', soft: '#dbeafe', label: 'Logística' },
  transport: { color: '#d97706', soft: '#fef3c7', label: 'Transporte y custodia' },
  reception: { color: '#0891b2', soft: '#cffafe', label: 'Punto de venta' },
  incident: { color: '#dc2626', soft: '#fee2e2', label: 'Supervisión' },
}

export const eventLabels: Record<string, string> = {
  production_registered: 'Producción registrada',
  inventory_movement_registered: 'Movimiento de inventario',
  request_created: 'Solicitud registrada',
  request_availability_confirmed: 'Disponibilidad confirmada',
  request_payment_registered: 'Pago registrado',
  request_authorized: 'Solicitud autorizada',
  dispatch_created: 'Despacho preparado',
  dispatch_departed: 'Salida física y custodia',
  reception_registered: 'Recepción registrada',
  reception_difference_detected: 'Diferencia detectada',
  incident_created: 'Incidencia creada',
  incident_closed: 'Incidencia cerrada',
}

export function eventArea(event: TraceabilityEvent): TraceabilityArea {
  if (event.event_type.startsWith('production')) return 'production'
  if (event.event_type.startsWith('inventory')) return 'inventory'
  if (event.event_type.startsWith('request')) return 'commercial'
  if (event.event_type === 'dispatch_departed' && event.operational_actor) return 'transport'
  if (event.event_type.startsWith('dispatch')) return 'logistics'
  if (event.event_type.startsWith('reception_difference')) return 'incident'
  if (event.event_type.startsWith('reception')) return 'reception'
  return 'incident'
}
