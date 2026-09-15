import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'

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
