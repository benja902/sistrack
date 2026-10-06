import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'

import { analyzeDifferences, explainTraceability, queryAiContext } from './api/ai.api'
import { AiAssistantPanel } from './components/AiAssistantPanel'
import type { AiContextType, AiQueryResponse, AiResponse } from './types/ai.types'

vi.mock('./api/ai.api', () => ({
  queryAiContext: vi.fn(), analyzeDifferences: vi.fn(), explainTraceability: vi.fn(),
}))

const answer: AiQueryResponse = {
  tipo: 'consulta_contextual', respuesta: 'Despacho completado.',
  evidencia: ['Despacho: DES-TEST'], advertencias: ['Revisar el registro.'],
  informacion_no_disponible: ['Causa no determinada.'], fallback_used: true,
}

function auth(role = 'ADMINISTRADOR'): AuthContextValue {
  return {
    status: 'authenticated',
    user: { id: 'admin', name: 'Admin', email: 'admin@example.test', role: { id: 'role', code: role, name: role } },
    login: vi.fn(), logout: vi.fn(),
  }
}

function mount(role = 'ADMINISTRADOR', contextType: AiContextType = 'dispatch') {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  function view(contextId = 'record-1', revision = 1) {
    return <AuthContext.Provider value={auth(role)}><QueryClientProvider client={client}>
      <AiAssistantPanel contextType={contextType} contextId={contextId} contextLabel="DES-TEST" revision={revision} dispatchId={contextId} explain />
    </QueryClientProvider></AuthContext.Provider>
  }
  return { ...render(view()), view }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(queryAiContext).mockResolvedValue(answer)
})

describe('AiAssistantPanel', () => {
  it.each([
    ['dispatch', 'Despacho'], ['production', 'Producción'], ['reception', 'Recepción'],
    ['incident', 'Incidencia'], ['traceability', 'Trazabilidad'],
  ] as const)('identifica el contexto %s en español', (contextType, label) => {
    mount('ADMINISTRADOR', contextType)
    expect(screen.getByText(`Contexto actual: DES-TEST · ${label}`)).toBeInTheDocument()
    expect(queryAiContext).not.toHaveBeenCalled()
  })

  it.each([false, true])('presenta los tres RF en lenguaje de usuario (fallback=%s)', async (fallbackUsed) => {
    const evidence = [
      'Estado despacho: COMPLETED', 'Estado recepción: WITH_DIFFERENCE',
      'Incidencia: INC-20260915-001, estado OPEN', 'Diferencia registrada: -0.500 L',
      'Cantidad despachada: 15.500 L', 'Fecha recepción: 2026-09-15T17:51:47.588023+00:00',
    ]
    const common = { ...answer, evidencia: evidence, fallback_used: fallbackUsed }
    const traceability: AiResponse = {
      ...common, tipo: 'trazabilidad', resumen: 'Se transportan 4.000 ejemplares.',
      estado_actual: 'IN_TRANSIT', observaciones: ['Estado recepción: WITH_DIFFERENCE'],
    }
    const difference: AiResponse = {
      ...common, tipo: 'analisis_diferencia', diferencia: '-0.500',
      interpretacion: 'Faltante de 0.500 L.', accion_sugerida: 'Revisar la incidencia OPEN.',
    }
    vi.mocked(explainTraceability).mockResolvedValue(traceability)
    vi.mocked(analyzeDifferences).mockResolvedValue(difference)
    vi.mocked(queryAiContext).mockResolvedValue({ ...common, respuesta: 'Incidencia CLOSED.' })
    const { container } = mount()

    fireEvent.click(screen.getByRole('button', { name: 'Explicar trazabilidad' }))
    expect(await screen.findByText('Estado actual: En transporte')).toBeInTheDocument()
    expect(screen.getByText('Se transportan 4 ejemplares.')).toBeInTheDocument()
    expect(screen.getByText('Diferencia: faltante de 0.5 L')).toBeInTheDocument()
    expect(screen.getByText('Fecha de recepción: 15/09/2026, 12:51')).toBeInTheDocument()
    expect(screen.getByText('Fechas y horas en horario de Perú.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Analizar diferencias' }))
    expect(await screen.findByText('Faltante de 0.5 L.')).toBeInTheDocument()
    expect(screen.getByText('Acción sugerida: Revisar la incidencia Abierta.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Pregunta sobre este registro'), { target: { value: '¿Cómo está la incidencia?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByText('Incidencia Cerrada.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/IN_TRANSIT|WITH_DIFFERENCE|COMPLETED|OPEN|CLOSED|T17:51/)
    expect(difference.diferencia).toBe('-0.500')
    expect(traceability.estado_actual).toBe('IN_TRANSIT')
  })

  it('envía contexto explícito y pregunta recortada y muestra respaldo/evidencia', async () => {
    mount()
    expect(screen.getByText(/Contexto actual: DES-TEST/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Pregunta sobre este registro'), { target: { value: '  ¿Cuál es su estado?  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByText('Despacho completado.')).toBeInTheDocument()
    expect(queryAiContext).toHaveBeenCalledWith({ context_type: 'dispatch', context_id: 'record-1' }, '¿Cuál es su estado?', expect.any(AbortSignal))
    expect(screen.getByText('Respuesta de respaldo basada en registros')).toBeInTheDocument()
    expect(screen.getByText('Despacho: DES-TEST')).toBeInTheDocument()
    expect(screen.getByText('Causa no determinada.')).toBeInTheDocument()
    expect(screen.getByText('Revisar el registro.')).toBeInTheDocument()
  })

  it('no hace llamadas automáticas y muestra loading mientras espera', async () => {
    let finish!: (value: AiQueryResponse) => void
    vi.mocked(queryAiContext).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    mount()
    expect(queryAiContext).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Pregunta sobre este registro'), { target: { value: 'Resume este despacho' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Consultando el registro')
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeDisabled()
    await act(async () => finish(answer))
    expect(await screen.findByText('Despacho completado.')).toBeInTheDocument()
  })

  it('rechaza entradas vacías o largas sin truncarlas', () => {
    mount()
    const input = screen.getByLabelText('Pregunta sobre este registro')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('entre 1 y 1000')
    fireEvent.change(input, { target: { value: 'x'.repeat(1001) } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(input).toHaveValue('x'.repeat(1001))
    expect(queryAiContext).not.toHaveBeenCalled()
  })

  it('presenta errores del backend', async () => {
    vi.mocked(queryAiContext).mockRejectedValue(new Error('Despacho no encontrado.'))
    mount()
    fireEvent.change(screen.getByLabelText('Pregunta sobre este registro'), { target: { value: 'Estado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Despacho no encontrado.')
  })

  it('oculta el panel para roles no autorizados', () => {
    mount('OPERADOR')
    expect(screen.queryByRole('region', { name: 'Asistente de IA' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Consultar' })).not.toBeInTheDocument()
  })

  it('reinicia respuestas al cambiar registro o revisión', async () => {
    const view = mount()
    fireEvent.change(screen.getByLabelText('Pregunta sobre este registro'), { target: { value: 'Estado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await screen.findByText('Despacho completado.')
    view.rerender(view.view('record-2'))
    expect(screen.queryByText('Despacho completado.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Pregunta sobre este registro')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Pregunta sobre este registro'), { target: { value: 'Estado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await screen.findByText('Despacho completado.')
    view.rerender(view.view('record-2', 2))
    expect(screen.queryByText('Despacho completado.')).not.toBeInTheDocument()
  })

  it('aborta una solicitud al cambiar contexto e ignora el resultado antiguo', async () => {
    let finish!: (value: AiQueryResponse) => void
    vi.mocked(queryAiContext).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const view = mount()
    fireEvent.change(screen.getByLabelText('Pregunta sobre este registro'), { target: { value: 'Estado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await waitFor(() => expect(queryAiContext).toHaveBeenCalled())
    const signal = vi.mocked(queryAiContext).mock.calls[0][2]
    view.rerender(view.view('record-2'))
    expect(signal?.aborted).toBe(true)
    await act(async () => finish(answer))
    expect(screen.queryByText('Despacho completado.')).not.toBeInTheDocument()
  })

  it('invoca los endpoints de explicación y diferencias', async () => {
    vi.mocked(explainTraceability).mockResolvedValue({
      ...answer, tipo: 'trazabilidad', resumen: 'Historia registrada.', estado_actual: 'COMPLETED', observaciones: [],
    })
    vi.mocked(analyzeDifferences).mockResolvedValue({
      ...answer, tipo: 'analisis_diferencia', interpretacion: 'Faltante de 5.', diferencia: '-5', accion_sugerida: 'Revisar recepción.',
    })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Explicar trazabilidad' }))
    expect(await screen.findByText('Historia registrada.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Analizar diferencias' }))
    expect(await screen.findByText('Faltante de 5.')).toBeInTheDocument()
    expect(analyzeDifferences).toHaveBeenCalledWith('record-1', expect.any(AbortSignal))
  })
})
