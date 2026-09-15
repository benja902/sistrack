import { LayoutDashboard, Menu, PackageSearch } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-border bg-card md:block">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <PackageSearch className="size-6 text-primary" aria-hidden="true" />
          <span className="font-semibold tracking-tight">Sitrack</span>
        </div>
        <nav className="space-y-1 px-3 py-5" aria-label="Navegación principal">
          <a
            className="flex items-center gap-3 rounded-md bg-muted px-3 py-2 text-sm font-medium"
            href="/"
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Inicio
          </a>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <Menu className="size-5" aria-hidden="true" />
            <span className="font-semibold">Sitrack</span>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">Administración</div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
