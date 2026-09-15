import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EmptyModulePage } from '@/pages/EmptyModulePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const administrationRoutes = [
  'produccion',
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
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...administrationRoutes.map((path) => ({ path, element: <EmptyModulePage /> })),
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
