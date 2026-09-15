import { GitPullRequestClosed, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { administrationNavigation } from '@/components/layout/navigation'
import { cn } from '@/utils/cn'

type SidebarProps = {
  className?: string
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ className, onClose, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col bg-nav text-white shadow-[2px_0_12px_rgba(10,41,72,0.12)]',
        className,
      )}
    >
      <div className="flex items-start justify-between border-b border-white/10 px-5 pb-4 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-white/10 text-[#8ed1c1]">
            <GitPullRequestClosed className="size-4" aria-hidden="true" />
          </div>
          <div>
            <span className="block text-[15px] font-bold leading-tight tracking-tight">Kotosh · Canchán</span>
            <span className="block pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-200/70">
              Trazabilidad de productos
            </span>
          </div>
        </div>
        {onClose ? (
          <button
            className="-mr-1 -mt-1 grid size-8 place-items-center rounded-md text-blue-100/75 hover:bg-white/10 hover:text-white"
            type="button"
            onClick={onClose}
            aria-label="Cerrar navegación"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Portal administrativo">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          Portal administrativo
        </p>
        {administrationNavigation.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
                isActive
                  ? 'bg-primary-container font-medium text-white shadow-sm'
                  : 'font-normal text-blue-100/75 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon className="size-[19px] shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
