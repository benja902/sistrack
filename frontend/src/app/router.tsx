import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/components/AuthRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InventoryExistenceDetailPage } from '@/features/inventory/pages/InventoryExistenceDetailPage'
import { InventoryExistencePage } from '@/features/inventory/pages/InventoryExistencePage'
import { InventoryMovementDetailPage } from '@/features/inventory/pages/InventoryMovementDetailPage'
import { InventoryMovementPage } from '@/features/inventory/pages/InventoryMovementPage'
import { DispatchDetailPage } from '@/features/logistics/pages/DispatchDetailPage'
import { DispatchListPage } from '@/features/logistics/pages/DispatchListPage'
import { ReceptionDetailPage } from '@/features/logistics/pages/ReceptionDetailPage'
import { ReceptionListPage } from '@/features/logistics/pages/ReceptionListPage'
import { ProductionDetailPage } from '@/features/production/pages/ProductionDetailPage'
import { ProductionListPage } from '@/features/production/pages/ProductionListPage'
import { RequestCreatePage } from '@/features/requests/pages/RequestCreatePage'
import { RequestDetailPage } from '@/features/requests/pages/RequestDetailPage'
import { RequestListPage } from '@/features/requests/pages/RequestListPage'
import { EmptyModulePage } from '@/pages/EmptyModulePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const administrationRoutes = [
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
          { path: 'solicitudes', element: <RequestListPage /> },
          { path: 'solicitudes/nueva', element: <RequestCreatePage /> },
          { path: 'solicitudes/:requestId', element: <RequestDetailPage /> },
          { path: 'logistica', element: <DispatchListPage /> },
          { path: 'logistica/despachos/:dispatchId', element: <DispatchDetailPage /> },
          { path: 'logistica/recepciones', element: <ReceptionListPage /> },
          { path: 'logistica/recepciones/:dispatchId', element: <ReceptionDetailPage /> },
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
