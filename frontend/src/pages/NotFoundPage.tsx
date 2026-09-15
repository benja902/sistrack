import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Página no encontrada</h1>
        <Link className="mt-4 inline-block text-sm font-medium text-primary underline" to="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
