import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, vi } from 'vitest'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

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

function renderWithAuthentication(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.localStorage.setItem('sitrack.access_token', 'test-token')
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => authenticatedUser,
  } as Response)))
})

afterEach(() => {
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

describe('AdminLayout', () => {
  it('muestra la navegación administrativa y el perfil configurado', async () => {
    renderWithAuthentication(
      <MemoryRouter initialEntries={['/inventario']}>
        <AdminLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: /portal administrativo/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inventario' })).toHaveClass('bg-primary-container')
    expect(screen.getByLabelText(/centro de producción/i)).toHaveValue('Todos los centros')
    expect(await screen.findByText('Abraham')).toBeInTheDocument()
    expect(screen.getByText('Administrador · Supervisión')).toBeInTheDocument()
  })
})

describe('DashboardPage', () => {
  it('muestra el resumen administrativo con los datos mock aislados', async () => {
    renderWithAuthentication(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Resumen operativo' })).toBeInTheDocument()
    expect(screen.getByText('Producción de leche hoy')).toBeInTheDocument()
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument()
    expect(screen.getByText(/Vista general consolidada de todos los centros/i)).toBeInTheDocument()
    expect(await screen.findByText('Abraham')).toBeInTheDocument()
  })
})
