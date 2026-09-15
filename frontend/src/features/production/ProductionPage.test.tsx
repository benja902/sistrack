import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'

import { ProductionDetailPage } from './pages/ProductionDetailPage'
import { ProductionListPage } from './pages/ProductionListPage'
import type { MilkProductionApi, MilkProductionDetailApi } from './types/production.types'

const productionId = '10000000-0000-0000-0000-000000000001'
const authenticatedUser = {
  id: '00000000-0000-0000-0000-000000000501',
  name: 'Abraham',
  email: 'abraham@example.test',
  role: {
    id: '00000000-0000-0000-0000-000000000001',
    code: 'ADMINISTRADOR',
    name: 'Administrador / Supervisor',
  },
}

const production: MilkProductionApi = {
  id: productionId,
  lot_code: 'LEC-KOT-20260915-001',
  production_date: '2026-09-15',
  responsible: 'Vilma',
  responsible_actor: {
    id: '00000000-0000-0000-0000-000000000401',
    full_name: 'Vilma',
  },
  total_liters: '22.000',
  registered_by_user_id: '00000000-0000-0000-0000-000000000301',
  registered_by: {
    id: '00000000-0000-0000-0000-000000000301',
    full_name: 'Administrador temporal',
  },
  created_at: '2026-09-15T07:30:00-05:00',
  center: {
    id: '00000000-0000-0000-0000-000000000101',
    code: 'KOTOSH',
    name: 'Kotosh',
  },
  product: {
    id: '00000000-0000-0000-0000-000000000201',
    sku: 'LECHE',
    name: 'Leche',
    unit_of_measure: 'L',
  },
}

const detail: MilkProductionDetailApi = {
  ...production,
  details: [
    { id: '1', animal_reference: 'Vaca 01', liters: '7.500', created_at: production.created_at },
    { id: '2', animal_reference: 'Vaca 02', liters: '8.000', created_at: production.created_at },
    { id: '3', animal_reference: 'Vaca 03', liters: '6.500', created_at: production.created_at },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function installSuccessfulApiMock() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/auth/me')) return jsonResponse(authenticatedUser)
    if (url.includes(`/${productionId}`)) return jsonResponse(detail)
    if (url.includes('center_code=CANCHAN')) return jsonResponse([])
    return jsonResponse([production])
  }))
}

function renderProduction(initialEntry = '/produccion') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="produccion" element={<ProductionListPage />} />
              <Route path="produccion/:productionId" element={<ProductionDetailPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.localStorage.setItem('sitrack.access_token', 'test-token')
  installSuccessfulApiMock()
})
afterEach(() => {
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

describe('ProductionListPage', () => {
  it('carga registros reales y muestra Canchán vacío al cambiar el centro', async () => {
    renderProduction()

    expect(await screen.findByText('Litros por día (Kotosh)')).toBeInTheDocument()
    expect(screen.getAllByText('Producción registrada').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Registrada').length).toBeGreaterThan(0)
    expect(screen.queryByText('Cerrado')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Centro de producción'), { target: { value: 'Canchán' } })

    expect(await screen.findByRole(
      'heading',
      { name: 'Sin registros de producción' },
      { timeout: 3_000 },
    )).toBeInTheDocument()
    expect(screen.getByText('No existen registros de producción de leche para el centro Canchán.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Registros de producción' })).not.toBeInTheDocument()
  })

  it('muestra el estado de error y permite reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: 'Error de prueba' }, 500)))

    renderProduction()

    expect(await screen.findByRole('heading', { name: 'No se pudo cargar la producción' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('ProductionDetailPage', () => {
  it('consulta el origen trazable y los detalles desde la API', async () => {
    renderProduction(`/produccion/${productionId}`)

    expect(await screen.findByRole('heading', { name: 'Detalle de producción' })).toBeInTheDocument()
    expect(screen.getAllByText('LEC-KOT-20260915-001').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Detalle por vaca' })).toBeInTheDocument()
    expect(screen.getByText('Evento inicial')).toBeInTheDocument()
    expect(screen.getByText('Producción registrada')).toBeInTheDocument()
    expect(screen.getByText('Registrado por')).toBeInTheDocument()
    expect(screen.getByText('Administrador temporal')).toBeInTheDocument()
  })
})
