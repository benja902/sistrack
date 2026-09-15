import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'
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
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'produccion', element: <ProductionListPage /> },
      { path: 'produccion/:productionId', element: <ProductionDetailPage /> },
      ...administrationRoutes.map((path) => ({ path, element: <EmptyModulePage /> })),
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
