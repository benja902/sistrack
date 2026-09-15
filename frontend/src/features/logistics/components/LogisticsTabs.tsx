import { NavLink } from 'react-router-dom'

import { cn } from '@/utils/cn'

export function LogisticsTabs() {
  return (
    <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1" aria-label="Secciones de logística">
      {[
        { label: 'Despachos', path: '/logistica' },
        { label: 'Recepciones', path: '/logistica/recepciones' },
      ].map((tab) => (
        <NavLink key={tab.path} end className={({ isActive }) => cn('rounded-md px-4 py-2 text-xs font-semibold', isActive ? 'bg-primary text-white' : 'text-slate hover:bg-slate-50')} to={tab.path}>{tab.label}</NavLink>
      ))}
    </nav>
  )
}
