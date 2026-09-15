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

const authenticatedUser = {
  id: '00000000-0000-0000-0000-000000000501',
  name: 'Administrador',
  email: 'admin@example.test',
  role: { id: 'role-admin', code: 'ADMINISTRADOR', name: 'Administrador / Supervisor' },
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
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => authenticatedUser,
  }) as Response))
})

afterEach(() => {
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

describe('InventoryExistencePage', () => {
  it('calcula disponible y filtra las existencias por el centro global', async () => {
    renderInventory()
    await screen.findByLabelText('Perfil de Administrador, Administrador, Supervisión')

    fireEvent.change(screen.getByLabelText('Centro de producción'), { target: { value: 'Kotosh' } })

    const summary = screen.getByRole('region', { name: 'Resumen de existencias' })
    expect(within(summary).getByText('980')).toBeInTheDocument()
    expect(within(summary).getByText('120')).toBeInTheDocument()
    expect(within(summary).getByText('860')).toBeInTheDocument()

    const juvenileRow = screen.getByText('Juvenil H', { selector: 'td' }).closest('tr')
    expect(juvenileRow).not.toBeNull()
    expect(within(juvenileRow!).getByText('130')).toBeInTheDocument()
    expect(within(juvenileRow!).getAllByText('30').length).toBeGreaterThan(0)
    expect(within(juvenileRow!).getByText('100')).toBeInTheDocument()
  })

  it('muestra el mismo balance en el detalle sin controles de edición', async () => {
    renderInventory('/inventario/existencias/kot-juvenil-h')
    await screen.findByLabelText('Perfil de Administrador, Administrador, Supervisión')

    expect(screen.getByRole('heading', { name: 'Detalle de existencia' })).toBeInTheDocument()
    expect(screen.getByText('Disponible = Existencia física − Reservado')).toBeInTheDocument()
    expect(screen.getByText('MOV-KOT-001')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar|ajustar|registrar/i })).not.toBeInTheDocument()
  })
})

describe('InventoryMovementPage', () => {
  it('mantiene el historial coherente y muestra Canchán sin movimientos mock', async () => {
    renderInventory('/inventario/movimientos')
    await screen.findByLabelText('Perfil de Administrador, Administrador, Supervisión')

    expect(screen.getByText('MOV-KOT-001')).toBeInTheDocument()
    expect(screen.getAllByText('Salida por venta').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('Centro de producción'), { target: { value: 'Canchán' } })

    expect(screen.getByRole('heading', { name: 'Sin movimientos' })).toBeInTheDocument()
    expect(screen.queryByText('MOV-KOT-001')).not.toBeInTheDocument()
  })

  it('deriva el impacto del movimiento y enlaza la existencia afectada', async () => {
    renderInventory('/inventario/movimientos/mov-kot-001')
    await screen.findByLabelText('Perfil de Administrador, Administrador, Supervisión')

    expect(screen.getByRole('heading', { name: 'Detalle de movimiento' })).toBeInTheDocument()
    expect(screen.getAllByText('MOV-KOT-001').length).toBeGreaterThan(0)
    expect(screen.getByText('136 − 6 = 130')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver existencia afectada' })).toHaveAttribute(
      'href',
      '/inventario/existencias/kot-juvenil-h',
    )
  })
})
