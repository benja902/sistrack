import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'

import { InventoryExistenceDetailPage } from './pages/InventoryExistenceDetailPage'
import { InventoryExistencePage } from './pages/InventoryExistencePage'
import { InventoryMovementDetailPage } from './pages/InventoryMovementDetailPage'
import { InventoryMovementPage } from './pages/InventoryMovementPage'
import type {
  InventoryCategory,
  InventoryExistenceApi,
  InventoryMovementApi,
} from './types/inventory.types'

const existenceId = '11000000-0000-0000-0000-000000000006'
const movementId = '12000000-0000-0000-0000-000000000001'
const authenticatedUser = {
  id: '00000000-0000-0000-0000-000000000501',
  name: 'Abraham',
  email: 'abraham@example.test',
  role: { id: 'role-admin', code: 'ADMINISTRADOR', name: 'Administrador / Supervisor' },
}
const center = {
  id: '00000000-0000-0000-0000-000000000101',
  code: 'KOTOSH' as const,
  name: 'Kotosh' as const,
}

function existence(
  id: string,
  category: InventoryCategory,
  physical: number,
  reserved: number,
): InventoryExistenceApi {
  return {
    id,
    center,
    category,
    physical_quantity: physical,
    reserved_quantity: reserved,
    available_quantity: physical - reserved,
    created_at: '2026-09-15T08:00:00-05:00',
    updated_at: '2026-09-15T08:00:00-05:00',
  }
}

const existences: InventoryExistenceApi[] = [
  existence('1', 'Adultos / reproductores H', 230, 20),
  existence('2', 'Adultos / reproductores M', 180, 10),
  existence('3', 'Lactantes', 140, 0),
  existence('4', 'Destete H', 95, 15),
  existence('5', 'Destete M', 85, 15),
  existence(existenceId, 'Juvenil H', 130, 30),
  existence('7', 'Juvenil M', 120, 30),
]

const movement: InventoryMovementApi = {
  id: movementId,
  balance_id: existenceId,
  center,
  category: 'Juvenil H',
  movement_type: 'SALE',
  quantity: -6,
  physical_quantity_before: 136,
  physical_quantity_after: 130,
  reference_type: null,
  reference_id: null,
  description: 'Salida física por venta de cuyes.',
  registered_by_user_id: authenticatedUser.id,
  registered_by: { id: authenticatedUser.id, full_name: 'Abraham' },
  occurred_at: '2026-09-13T10:20:00-05:00',
  created_at: '2026-09-13T10:20:00-05:00',
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
    if (url.includes(`/inventory/existences/${existenceId}`)) {
      return jsonResponse({ ...existences[5], movements: [movement] })
    }
    if (url.includes(`/inventory/movements/${movementId}`)) return jsonResponse(movement)
    if (url.includes('/inventory/existences')) return jsonResponse(existences)
    if (url.includes('center_code=CANCHAN')) return jsonResponse([])
    if (url.includes('/inventory/movements')) return jsonResponse([movement])
    return jsonResponse({ detail: 'Ruta no simulada.' }, 404)
  }))
}

function renderInventory(initialEntry = '/inventario') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="inventario" element={<InventoryExistencePage />} />
              <Route path="inventario/existencias/:existenceId" element={<InventoryExistenceDetailPage />} />
              <Route path="inventario/movimientos" element={<InventoryMovementPage />} />
              <Route path="inventario/movimientos/:movementId" element={<InventoryMovementDetailPage />} />
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

describe('InventoryExistencePage', () => {
  it('carga la API y muestra el disponible calculado por backend', async () => {
    renderInventory()

    const summary = await screen.findByRole('region', { name: 'Resumen de existencias' })
    expect(within(summary).getByText('980')).toBeInTheDocument()
    expect(within(summary).getByText('120')).toBeInTheDocument()
    expect(within(summary).getByText('860')).toBeInTheDocument()

    const juvenileRow = screen.getByText('Juvenil H', { selector: 'td' }).closest('tr')
    expect(juvenileRow).not.toBeNull()
    expect(within(juvenileRow!).getByText('100')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventory/existences'),
      expect.any(Object),
    )
  })

  it('consulta el detalle y sus movimientos desde la API', async () => {
    renderInventory(`/inventario/existencias/${existenceId}`)

    expect(await screen.findByRole('heading', { name: 'Detalle de existencia' })).toBeInTheDocument()
    expect(screen.getByText('Disponible = Existencia física − Reservado')).toBeInTheDocument()
    expect(screen.getByText('MOV-00000001')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar|ajustar|registrar/i })).not.toBeInTheDocument()
  })

  it('muestra estado de error y permite reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => (
      String(input).endsWith('/auth/me')
        ? jsonResponse(authenticatedUser)
        : jsonResponse({ detail: 'Error de prueba' }, 500)
    )))

    renderInventory()

    expect(await screen.findByRole('heading', { name: 'No se pudo cargar el inventario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('InventoryMovementPage', () => {
  it('carga movimientos reales y representa el vacío de un centro sin resultados', async () => {
    renderInventory('/inventario/movimientos')

    expect(await screen.findByText('MOV-00000001')).toBeInTheDocument()
    expect(screen.getAllByText('Salida por venta').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('Centro de producción'), { target: { value: 'Canchán' } })

    expect(await screen.findByRole('heading', { name: 'Sin movimientos' })).toBeInTheDocument()
  })

  it('consulta el impacto persistido y enlaza la existencia afectada', async () => {
    renderInventory(`/inventario/movimientos/${movementId}`)

    expect(await screen.findByRole('heading', { name: 'Detalle de movimiento' })).toBeInTheDocument()
    expect(screen.getAllByText('MOV-00000001').length).toBeGreaterThan(0)
    expect(screen.getByText('136 − 6 = 130')).toBeInTheDocument()
    expect(screen.getAllByText('Abraham').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Ver existencia afectada' })).toHaveAttribute(
      'href',
      `/inventario/existencias/${existenceId}`,
    )
  })
})
