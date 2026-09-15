import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminLayout } from '@/components/layout/AdminLayout'

import { AuthProvider } from './AuthProvider'
import { ProtectedRoute, PublicOnlyRoute } from './components/AuthRoute'
import { LoginPage } from './pages/LoginPage'

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

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function renderAuth(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<h1>Portal protegido</h1>} />
              </Route>
            </Route>
            <Route element={<PublicOnlyRoute />}>
              <Route path="login" element={<LoginPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

describe('autenticación administrativa', () => {
  it('renderiza el formulario de login y protege el portal', async () => {
    renderAuth('/')

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('inicia sesión, restaura el perfil y envía Bearer', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/login')) {
        return response({ access_token: 'valid-token', token_type: 'bearer', user: authenticatedUser })
      }
      const headers = new Headers(init?.headers)
      expect(headers.get('Authorization')).toBe('Bearer valid-token')
      return response(authenticatedUser)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAuth('/login')

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: authenticatedUser.email } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secure-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Portal protegido' })).toBeInTheDocument()
    expect(screen.getByText('Abraham')).toBeInTheDocument()
    expect(screen.getByText('Administrador · Supervisión')).toBeInTheDocument()
    expect(window.localStorage.getItem('sitrack.access_token')).toBe('valid-token')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('muestra un error para credenciales incorrectas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(
      { detail: 'Correo o contraseña incorrectos.' },
      401,
    )))
    renderAuth('/login')

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'wrong@example.test' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
  })

  it('restaura la sesión desde auth/me y cierra la sesión local', async () => {
    window.localStorage.setItem('sitrack.access_token', 'restored-token')
    vi.stubGlobal('fetch', vi.fn(async () => response(authenticatedUser)))
    renderAuth('/')

    expect(await screen.findByText('Abraham')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(window.localStorage.getItem('sitrack.access_token')).toBeNull())
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('redirige al portal cuando un usuario autenticado visita login', async () => {
    window.localStorage.setItem('sitrack.access_token', 'restored-token')
    vi.stubGlobal('fetch', vi.fn(async () => response(authenticatedUser)))
    renderAuth('/login')

    expect(await screen.findByRole('heading', { name: 'Portal protegido' })).toBeInTheDocument()
  })
})
