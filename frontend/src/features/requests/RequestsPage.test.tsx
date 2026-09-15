import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'

import { RequestCreatePage } from './pages/RequestCreatePage'
import { RequestDetailPage } from './pages/RequestDetailPage'
import { RequestListPage } from './pages/RequestListPage'
import type { GuineaPigRequest, RequestStatus } from './types/request.types'

const requestId = '21000000-0000-0000-0000-000000000001'
const authenticatedUser = {
  id: '00000000-0000-0000-0000-000000000501',
  name: 'Abraham',
  email: 'abraham@example.test',
  role: { id: 'role-admin', code: 'ADMINISTRADOR', name: 'Administrador / Supervisor' },
}
const balance = {
  id: '11000000-0000-0000-0000-000000000006',
  center: { id: 'center-id', code: 'KOTOSH' as const, name: 'Kotosh' as const },
  category: 'Juvenil H' as const,
  physical_quantity: 100,
  reserved_quantity: 10,
  available_quantity: 90,
  created_at: '2026-09-15T08:00:00-05:00',
  updated_at: '2026-09-15T08:00:00-05:00',
}

function request(status: RequestStatus = 'REQUESTED'): GuineaPigRequest {
  const reserved = status === 'REQUESTED' ? 10 : 18
  return {
    id: requestId,
    request_code: 'SOL-KOT-20260915-001',
    inventory_balance: {
      ...balance,
      reserved_quantity: reserved,
      available_quantity: 100 - reserved,
    },
    customer_name: 'Cliente de prueba',
    requested_quantity: 8,
    requested_for: '2026-09-20',
    status,
    receipt_status: status === 'REQUESTED' || status === 'AVAILABILITY_CONFIRMED' ? 'PENDING' : 'REGISTERED',
    receipt_reference: status === 'REQUESTED' || status === 'AVAILABILITY_CONFIRMED' ? null : 'B001-42',
    created_by_user: { id: authenticatedUser.id, full_name: 'Abraham' },
    authorized_by_user: status === 'AUTHORIZED' ? { id: authenticatedUser.id, full_name: 'Abraham' } : null,
    paid_at: status === 'PAID' || status === 'AUTHORIZED' ? '2026-09-15T10:00:00-05:00' : null,
    authorized_at: status === 'AUTHORIZED' ? '2026-09-15T11:00:00-05:00' : null,
    created_at: '2026-09-15T08:00:00-05:00',
    updated_at: '2026-09-15T08:00:00-05:00',
    reservation: status === 'REQUESTED' ? null : {
      id: 'reservation-id', quantity: 8, status: 'ACTIVE', created_at: '2026-09-15T09:00:00-05:00', released_at: null,
    },
  }
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

function renderRequests(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="solicitudes" element={<RequestListPage />} />
              <Route path="solicitudes/nueva" element={<RequestCreatePage />} />
              <Route path="solicitudes/:requestId" element={<RequestDetailPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => window.localStorage.setItem('sitrack.access_token', 'test-token'))
afterEach(() => {
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

describe('Solicitudes MVP', () => {
  it('lista datos reales y aplica el selector global de centro', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return jsonResponse(authenticatedUser)
      if (url.includes('center_code=CANCHAN')) return jsonResponse([])
      if (url.includes('/requests/guinea-pigs')) return jsonResponse([request()])
      return jsonResponse({ detail: 'Ruta no simulada.' }, 404)
    }))
    renderRequests('/solicitudes')

    expect(await screen.findByText('SOL-KOT-20260915-001')).toBeInTheDocument()
    expect(screen.getByText('Cliente de prueba')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Centro de producción'), { target: { value: 'Canchán' } })
    expect(await screen.findByRole('heading', { name: 'Sin solicitudes' })).toBeInTheDocument()
  })

  it('recorre confirmación, pago y autorización sin ofrecer salida física', async () => {
    let currentStatus: RequestStatus = 'REQUESTED'
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return jsonResponse(authenticatedUser)
      if (init?.method === 'POST' && url.endsWith('/confirm-availability')) currentStatus = 'AVAILABILITY_CONFIRMED'
      if (init?.method === 'POST' && url.endsWith('/register-payment')) currentStatus = 'PAID'
      if (init?.method === 'POST' && url.endsWith('/authorize')) currentStatus = 'AUTHORIZED'
      if (url.includes(`/requests/guinea-pigs/${requestId}`)) return jsonResponse(request(currentStatus))
      return jsonResponse([])
    }))
    renderRequests(`/solicitudes/${requestId}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar disponibilidad' }))
    expect(await screen.findByRole('button', { name: 'Registrar pago y boleta' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Referencia de boleta'), { target: { value: 'B001-42' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago y boleta' }))
    expect(await screen.findByRole('button', { name: 'Autorizar solicitud' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar solicitud' }))
    expect(await screen.findByRole('heading', { name: 'Solicitud autorizada' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /salida|despacho/i })).not.toBeInTheDocument()
    await waitFor(() => expect(currentStatus).toBe('AUTHORIZED'))
  })

  it('crea una solicitud sin enviar total de stock ni estado', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/me')) return jsonResponse(authenticatedUser)
      if (url.includes('/inventory/existences')) return jsonResponse([balance])
      if (init?.method === 'POST' && url.endsWith('/requests/guinea-pigs')) return jsonResponse(request(), 201)
      if (url.includes(`/requests/guinea-pigs/${requestId}`)) return jsonResponse(request())
      return jsonResponse([])
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRequests('/solicitudes/nueva')

    await screen.findByRole('option', { name: /Kotosh · Juvenil H/ })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Cliente de prueba' } })
    fireEvent.change(screen.getByLabelText('Centro y categoría'), { target: { value: balance.id } })
    fireEvent.change(screen.getByLabelText('Cantidad solicitada'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Fecha solicitada'), { target: { value: '2026-09-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear solicitud' }))

    await screen.findByRole('heading', { name: 'SOL-KOT-20260915-001' })
    const createCall = fetchMock.mock.calls.find(([url, init]) =>
      String(url).endsWith('/requests/guinea-pigs') && init?.method === 'POST')
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      inventory_balance_id: balance.id,
      customer_name: 'Cliente de prueba',
      requested_quantity: 8,
      requested_for: '2026-09-20',
    })
  })
})
