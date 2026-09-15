const accessTokenKey = 'sitrack.access_token'

export function getAccessToken() {
  return window.localStorage.getItem(accessTokenKey)
}

export function saveAccessToken(token: string) {
  window.localStorage.setItem(accessTokenKey, token)
}

export function removeAccessToken() {
  window.localStorage.removeItem(accessTokenKey)
}
