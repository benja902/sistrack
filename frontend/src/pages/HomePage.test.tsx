import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

describe('AdminLayout', () => {
  it('muestra la navegación administrativa y el perfil configurado', () => {
    render(
      <MemoryRouter initialEntries={['/inventario']}>
        <AdminLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: /portal administrativo/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inventario' })).toHaveClass('bg-primary-container')
    expect(screen.getByLabelText(/centro de producción/i)).toHaveValue('Todos los centros')
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Rol: Supervisión')).toBeInTheDocument()
  })
})

describe('DashboardPage', () => {
  it('muestra el resumen administrativo con los datos mock aislados', () => {
    render(
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
    expect(screen.getByText(/Centro: Todos los centros/i)).toBeInTheDocument()
  })
})
