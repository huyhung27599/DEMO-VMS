export const TOKEN_KEY = 'dashcam_auth_token'
export const USER_NAME_KEY = 'dashcam_auth_user'
export const REMEMBER_ME_KEY = 'dashcam_auth_remember'
export const REMEMBER_EXP_KEY = 'dashcam_auth_remember_exp'

const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 ngày

export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload) as Record<string, unknown>
  } catch {
    return null
  }
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  const decoded = parseJwt(token)
  if (!decoded || !decoded.exp) return false // Không có exp thì coi như chưa hết hạn
  const now = Math.floor(Date.now() / 1000)
  return (decoded.exp as number) < now
}

export function clearAuthStorage(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_NAME_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_NAME_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)
  localStorage.removeItem(REMEMBER_EXP_KEY)
}

export function hasPersistentSession(): boolean {
  if (localStorage.getItem(REMEMBER_ME_KEY) !== '1') return false
  const exp = parseInt(localStorage.getItem(REMEMBER_EXP_KEY) || '0', 10)
  if (Date.now() > exp) {
    clearAuthStorage()
    return false
  }
  return true
}

export function getToken(): string | null {
  if (localStorage.getItem(REMEMBER_ME_KEY) === '1') {
    const exp = parseInt(localStorage.getItem(REMEMBER_EXP_KEY) || '0', 10)
    if (Date.now() > exp) {
      clearAuthStorage()
      return null
    }
  }

  const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)

  if (token && isTokenExpired(token)) {
    console.warn('[Auth] Token JWT đã hết hạn. Đang dọn dẹp...')
    clearAuthStorage()
    return null
  }

  return token
}

export function getStoredUsername(): string {
  return sessionStorage.getItem(USER_NAME_KEY) || localStorage.getItem(USER_NAME_KEY) || 'admin'
}

export function saveAuthSession(token: string, username: string, rememberMe: boolean): void {
  clearAuthStorage()
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_NAME_KEY, username)
    localStorage.setItem(REMEMBER_ME_KEY, '1')
    localStorage.setItem(REMEMBER_EXP_KEY, String(Date.now() + REMEMBER_ME_DURATION_MS))
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(USER_NAME_KEY, username)
  }
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getUsername(): string {
  return getStoredUsername()
}
