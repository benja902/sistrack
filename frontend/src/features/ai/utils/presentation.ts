import type { AiContextType } from '../types/ai.types'

export const aiContextLabels: Record<AiContextType, string> = {
  dispatch: 'Despacho',
  production: 'Producción',
  reception: 'Recepción',
  incident: 'Incidencia',
  traceability: 'Trazabilidad',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente de salida',
  IN_TRANSIT: 'En transporte',
  COMPLETED: 'Completado',
  WITH_DIFFERENCE: 'Con diferencia',
  CONFORMING: 'Conforme',
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
}

const timestampPattern = /(?<![\w-])\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})(?![\w-])/g
const datePattern = /(?<![\w-])\d{4}-\d{2}-\d{2}(?![\w-])/g
const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Lima',
})
const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
})

// Keep decimal strings exact: presentation must not round operational quantities.
function compactDecimal(value: string): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value
}

function describeDifference(value: string, unit = ''): string {
  const quantity = compactDecimal(value)
  const magnitude = quantity.replace(/^-/, '')
  if (/^0(?:\.0*)?$/.test(magnitude)) return `sin diferencia (0${unit})`
  return `${quantity.startsWith('-') ? 'faltante de' : 'excedente de'} ${magnitude}${unit}`
}

export function hasAiTimestamp(text: string): boolean {
  return new RegExp(timestampPattern).test(text)
}

/** Translate only the visible text, leaving API values and identifiers intact. */
export function presentAiText(text: string): string {
  const difference = /^Diferencia registrada:\s*(-?\d+(?:\.\d+)?)(\s.*)?$/.exec(text)
  if (difference) {
    return `Diferencia: ${describeDifference(difference[1], difference[2])}`
  }

  return text
    .replace(timestampPattern, (value) => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date)
    })
    .replace(datePattern, (value) => {
      const date = new Date(`${value}T00:00:00Z`)
      return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
    })
    .replace(/(?<![\w-])(PENDING|IN_TRANSIT|COMPLETED|WITH_DIFFERENCE|CONFORMING|OPEN|CLOSED)(?![\w-])/g,
      (value) => statusLabels[value])
    .replace(/^Estado despacho:/, 'Estado del despacho:')
    .replace(/^Estado recepción:/, 'Estado de la recepción:')
    .replace(/^Fecha recepción:/, 'Fecha de recepción:')
    .replace(/^Referencia origen:/, 'Referencia de origen:')
    .replace(/Diferencia cuantitativa detectada en ([^:\n]+):\s*(-?\d+(?:\.\d+)?)(?=\.?(?:\s|$))/g,
      (_value, reference: string, quantity: string) => `Diferencia detectada en ${reference}: ${describeDifference(quantity)}`)
    .replace(/^(Cantidad (?:producida|despachada|recibida):\s*)(-?\d+\.\d+)(?=\s|$)/,
      (_value, label: string, quantity: string) => `${label}${compactDecimal(quantity)}`)
    .replace(/(?<![\w.-])-?\d+\.\d+(?![\w.-])(?=\s*(?:L|litros?|ejemplares?|cuyes|kg|kilogramos?|unidades?)\b)/gi,
      compactDecimal)
}
