import { apiFetch } from '@/services/http'

import type { AuthUser, LoginCredentials, LoginResponse } from '../types/auth.types'

export function loginRequest(credentials: LoginCredentials) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
}

export function fetchCurrentUser() {
  return apiFetch<AuthUser>('/auth/me')
}
