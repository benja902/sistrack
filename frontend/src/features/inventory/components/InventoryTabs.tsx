import { ArrowLeftRight, Boxes } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/utils/cn'

const tabs = [
  { label: 'Existencias', path: '/inventario', icon: Boxes },
  { label: 'Movimientos', path: '/inventario/movimientos', icon: ArrowLeftRight },
]

export function InventoryTabs() {
  return (
    <nav className="flex items-center gap-8 border-b border-border-subtle px-1" aria-label="Secciones de inventario">
      {tabs.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/inventario'}
          className={({ isActive }) => cn(
            'flex items-center gap-2 border-b-2 px-0.5 pb-3 text-sm transition-colors',
            isActive
              ? 'border-primary font-bold text-primary'
              : 'border-transparent font-medium text-slate hover:text-ink',
          )}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

