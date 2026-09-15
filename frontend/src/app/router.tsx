import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/components/AuthRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InventoryExistenceDetailPage } from '@/features/inventory/pages/InventoryExistenceDetailPage'
import { InventoryExistencePage } from '@/features/inventory/pages/InventoryExistencePage'
import { InventoryMovementDetailPage } from '@/features/inventory/pages/InventoryMovementDetailPage'
import { InventoryMovementPage } from '@/features/inventory/pages/InventoryMovementPage'
import { ProductionDetailPage } from '@/features/production/pages/ProductionDetailPage'
import { ProductionListPage } from '@/features/production/pages/ProductionListPage'
import { EmptyModulePage } from '@/pages/EmptyModulePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const administrationRoutes = [
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
          { path: 'inventario', element: <InventoryExistencePage /> },
          { path: 'inventario/existencias/:existenceId', element: <InventoryExistenceDetailPage /> },
          { path: 'inventario/movimientos', element: <InventoryMovementPage /> },
          { path: 'inventario/movimientos/:movementId', element: <InventoryMovementDetailPage /> },
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
