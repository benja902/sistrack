import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/components/AuthRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductionDetailPage } from '@/features/production/pages/ProductionDetailPage'
import { ProductionListPage } from '@/features/production/pages/ProductionListPage'
import { EmptyModulePage } from '@/pages/EmptyModulePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const administrationRoutes = [
  'inventario',
  'solicitudes',
  'logistica',
  'incidencias',
  'trazabilidad',
  'reportes',
  'configuracion',
]

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'produccion', element: <ProductionListPage /> },
          { path: 'produccion/:productionId', element: <ProductionDetailPage /> },
          ...administrationRoutes.map((path) => ({ path, element: <EmptyModulePage /> })),
        ],
      },
    ],
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
