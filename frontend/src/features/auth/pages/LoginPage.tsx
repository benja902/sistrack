import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { ApiError } from '@/services/http'

import { useAuth } from '../useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await login({ email, password })
      const destination = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError && error.status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Inténtalo nuevamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <section className="w-full max-w-sm overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-lg">
        <div className="bg-primary-container px-7 py-7 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/10">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold">Sitrack</p>
              <p className="text-xs text-blue-100">Portal administrativo</p>
            </div>
          </div>
        </div>

        <form className="space-y-5 p-7" onSubmit={submit}>
          <div>
            <h1 className="text-xl font-bold text-ink">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-slate">Ingresa tus credenciales administrativas.</p>
          </div>

          <label className="block text-xs font-semibold text-ink">
            Correo
            <input
              autoComplete="email"
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-xs font-semibold text-ink">
            Contraseña
            <span className="relative mt-2 block">
              <LockKeyhole className="absolute left-3 top-2.5 size-4 text-slate" aria-hidden="true" />
              <input
                autoComplete="current-password"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </span>
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <Button className="h-10 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>
      </section>
    </main>
  )
}
