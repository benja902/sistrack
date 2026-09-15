import { Building2, ChevronDown, LogOut, Menu, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/features/auth/useAuth'

export type Center = 'Todos los centros' | 'Kotosh' | 'Canchán'

type TopBarProps = {
  center: Center
  onCenterChange: (center: Center) => void
  onOpenNavigation: () => void
}

export function TopBar({ center, onCenterChange, onOpenNavigation }: TopBarProps) {
  const { user, logout } = useAuth()
  const roleLabel = user?.role.code === 'ADMINISTRADOR' ? 'Administrador' : user?.role.name

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-white/95 px-4 shadow-sm backdrop-blur md:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          className="grid size-9 place-items-center rounded-md text-slate hover:bg-canvas lg:hidden"
          type="button"
          onClick={onOpenNavigation}
          aria-label="Abrir navegación"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <label className="relative flex min-w-[172px] items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <Building2 className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-slate">
              Centro
            </span>
            <select
              className="mt-0.5 w-full appearance-none bg-transparent pr-4 text-xs font-bold leading-tight text-ink outline-none"
              value={center}
              aria-label="Centro de producción"
              onChange={(event) => onCenterChange(event.target.value as Center)}
            >
              <option>Todos los centros</option>
              <option>Kotosh</option>
              <option>Canchán</option>
            </select>
          </span>
          <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-slate" aria-hidden="true" />
        </label>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden text-right sm:block">
          <span className="block text-xs font-semibold leading-tight text-ink">{user?.name}</span>
          <span className="block pt-0.5 text-[11px] font-medium leading-tight text-slate">{roleLabel} · Supervisión</span>
        </div>
        <div
          className="grid size-8 place-items-center rounded-full bg-primary text-white shadow-sm"
          aria-label={`Perfil de ${user?.name ?? 'usuario'}, ${roleLabel ?? 'sin rol'}, Supervisión`}
        >
          <ShieldCheck className="size-[18px]" aria-hidden="true" />
        </div>
        <button
          className="grid size-8 place-items-center rounded-md text-slate transition-colors hover:bg-slate-100 hover:text-ink"
          type="button"
          onClick={logout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
