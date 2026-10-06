import { describe, expect, it } from 'vitest'

import { aiContextLabels, presentAiText } from './presentation'

describe('presentación del asistente para usuarios', () => {
  it.each([
    ['Estado despacho: PENDING', 'Estado del despacho: Pendiente de salida'],
    ['Estado despacho: IN_TRANSIT', 'Estado del despacho: En transporte'],
    ['Estado despacho: COMPLETED', 'Estado del despacho: Completado'],
    ['Estado recepción: WITH_DIFFERENCE', 'Estado de la recepción: Con diferencia'],
    ['Estado recepción: CONFORMING', 'Estado de la recepción: Conforme'],
    ['Incidencia: INC-20260915-001, estado OPEN', 'Incidencia: INC-20260915-001, estado Abierta'],
    ['Incidencia: INC-20260915-001, estado CLOSED', 'Incidencia: INC-20260915-001, estado Cerrada'],
    ['Diferencia registrada: -0.500 L', 'Diferencia: faltante de 0.5 L'],
    ['Diferencia registrada: 0.500 L', 'Diferencia: excedente de 0.5 L'],
    ['Diferencia registrada: 0.000 L', 'Diferencia: sin diferencia (0 L)'],
    ['Cantidad despachada: 15.500 L', 'Cantidad despachada: 15.5 L'],
    ['Cantidad recibida: 15.000 L', 'Cantidad recibida: 15 L'],
    ['Se despacharon 4.000 ejemplares; estado IN_TRANSIT.', 'Se despacharon 4 ejemplares; estado En transporte.'],
    ['Cantidad producida: 0.000125 L', 'Cantidad producida: 0.000125 L'],
  ])('presenta %s sin códigos ni ceros innecesarios', (raw, visible) => {
    expect(presentAiText(raw)).toBe(visible)
  })

  it('convierte instantes a horario de Perú y conserva la fecha de producción', () => {
    expect(presentAiText('Fecha recepción: 2026-09-15T17:51:47.588023+00:00'))
      .toBe('Fecha de recepción: 15/09/2026, 12:51')
    expect(presentAiText('Evento 2026-09-16T00:30:00Z: Recepción registrada.'))
      .toBe('Evento 15/09/2026, 19:30: Recepción registrada.')
    expect(presentAiText('Fecha de producción: 2026-09-15'))
      .toBe('Fecha de producción: 15/09/2026')
    expect(presentAiText('Evento 2026-09-15T17:51:49.310706+00:00: Diferencia cuantitativa detectada en DES-20260915-006: -0.500.'))
      .toBe('Evento 15/09/2026, 12:51: Diferencia detectada en DES-20260915-006: faltante de 0.5.')
  })

  it('conserva identificadores, textos ya legibles y referencias con números', () => {
    const text = 'DES-20260915-006 · LEC-KOT-20260915-001 · REF-2026-09-15 · REF-4.000 · REF-OPEN'
    expect(presentAiText(text)).toBe(text)
    expect(presentAiText('Recepción registrada con diferencia; incidencia cerrada.'))
      .toBe('Recepción registrada con diferencia; incidencia cerrada.')
  })

  it('nombra todas las áreas en español', () => {
    expect(Object.values(aiContextLabels)).toEqual(['Despacho', 'Producción', 'Recepción', 'Incidencia', 'Trazabilidad'])
  })
})
