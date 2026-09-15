import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'

import { ProductionDetailPage } from './pages/ProductionDetailPage'
import { ProductionListPage } from './pages/ProductionListPage'

function renderProduction(initialEntry = '/produccion') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="produccion" element={<ProductionListPage />} />
          <Route path="produccion/:productionId" element={<ProductionDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProductionListPage', () => {
  it('muestra los registros mock y responde al selector global de centro', () => {
    renderProduction()

    expect(screen.getByRole('heading', { name: 'Producción' })).toBeInTheDocument()
    expect(screen.getByText('Litros por día (Kotosh)')).toBeInTheDocument()
    expect(screen.getAllByText('Producción registrada').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('Centro de producción'), { target: { value: 'Canchán' } })

    expect(screen.getByLabelText('Centro de producción')).toHaveValue('Canchán')
    expect(screen.getByRole('heading', { name: 'Sin registros de producción' })).toBeInTheDocument()
    expect(screen.getByText('No existen registros de producción de leche para el centro Canchán.')).toBeInTheDocument()
    expect(screen.queryByText('Producción de leche — últimos 7 días')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Registros de producción' })).not.toBeInTheDocument()
  })
})

describe('ProductionDetailPage', () => {
  it('muestra el origen trazable y el detalle de una producción', () => {
    renderProduction('/produccion/lec-kot-20260913-01')

    expect(screen.getByRole('heading', { name: 'Detalle de producción' })).toBeInTheDocument()
    expect(screen.getAllByText('LEC-KOT-20260913-01').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Detalle por vaca' })).toBeInTheDocument()
    expect(screen.getByText('Evento inicial')).toBeInTheDocument()
    expect(screen.getByText('Producción registrada')).toBeInTheDocument()
  })
})
