import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  ClipboardList,
  FileBarChart,
  GitBranch,
  LayoutDashboard,
  PackageSearch,
  Settings,
  Truck,
  Warehouse,
} from 'lucide-react'

export type NavigationItem = {
  label: string
  path: string
  icon: LucideIcon
}

export const administrationNavigation: NavigationItem[] = [
  { label: 'Inicio', path: '/', icon: LayoutDashboard },
  { label: 'Producción', path: '/produccion', icon: PackageSearch },
  { label: 'Inventario', path: '/inventario', icon: Warehouse },
  { label: 'Solicitudes', path: '/solicitudes', icon: ClipboardList },
  { label: 'Logística', path: '/logistica', icon: Truck },
  { label: 'Incidencias', path: '/incidencias', icon: Boxes },
  { label: 'Trazabilidad', path: '/trazabilidad', icon: GitBranch },
  { label: 'Reportes', path: '/reportes', icon: FileBarChart },
  { label: 'Configuración', path: '/configuracion', icon: Settings },
]
