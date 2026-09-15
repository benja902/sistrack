import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { fetchCurrentUser, loginRequest } from './api/auth.api'
import { AuthContext, type AuthStatus } from './auth-context'
import { getAccessToken, removeAccessToken, saveAccessToken } from './auth-token'
import type { AuthUser, LoginCredentials } from './types/auth.types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (
    getAccessToken() ? 'loading' : 'unauthenticated'
  ))

  const logout = useCallback(() => {
    removeAccessToken()
    setUser(null)
    setStatus('unauthenticated')
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    if (!getAccessToken()) return
    let cancelled = false

    fetchCurrentUser()
      .then((currentUser) => {
        if (cancelled) return
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) logout()
      })

    return () => {
      cancelled = true
    }
  }, [logout])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await loginRequest(credentials)
    saveAccessToken(response.access_token)
    try {
      const currentUser = await fetchCurrentUser()
      setUser(currentUser)
      setStatus('authenticated')
    } catch (error) {
      removeAccessToken()
      throw error
    }
  }, [])

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [login, logout, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
