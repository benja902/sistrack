import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../useAuth'

function SessionLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6">
      <p className="text-sm font-medium text-slate">Verificando sesión...</p>
    </main>
  )
}

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionLoading />
  if (status === 'unauthenticated') {
    return <Navigate replace to="/login" state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') return <SessionLoading />
  if (status === 'authenticated') return <Navigate replace to="/" />
  return <Outlet />
}
