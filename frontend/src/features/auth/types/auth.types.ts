export type AuthRole = {
  id: string
  code: string
  name: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: AuthRole
}

export type LoginCredentials = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string
  token_type: 'bearer'
  user: AuthUser
}
