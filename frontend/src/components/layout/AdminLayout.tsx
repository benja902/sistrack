import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export function AdminLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const [selectedCenter, setSelectedCenter] = useState<'Todos los centros' | 'Kotosh' | 'Canchán'>(
    'Todos los centros',
  )
  const location = useLocation()

  const closeNavigation = () => setIsNavigationOpen(false)

  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="hidden h-screen lg:sticky lg:top-0 lg:block">
        <Sidebar />
      </div>

      {isNavigationOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 cursor-default bg-ink/35"
            type="button"
            aria-label="Cerrar navegación"
            onClick={closeNavigation}
          />
          <div className="relative h-full w-64">
            <Sidebar onClose={closeNavigation} onNavigate={closeNavigation} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col">
        <TopBar
          center={selectedCenter}
          onCenterChange={setSelectedCenter}
          onOpenNavigation={() => setIsNavigationOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
