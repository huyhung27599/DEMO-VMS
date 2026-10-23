import type { ApiResponse, AuthBridge } from './types'

export type { ApiResponse, AuthBridge } from './types'

export function resolveBaseUrl(loc: { hostname: string; protocol: string }): string {
  // Dev trên localhost: gọi /api cùng origin để Vite proxy sang server.
  // Cookie CSRF SameSite=Lax không được gửi khi browser gọi thẳng IP khác origin.
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
    return '/api/'
  }
  return 'http://119.17.211.170:4000/api/'
}

export const BASE_URL: string = resolveBaseUrl(window.location)

let csrfTokenCache: string | null = null
let authBridge: AuthBridge | null = null

export function registerAuthBridge(b: AuthBridge): void {
  authBridge = b
}

function getStoredToken(): string | null {
  return sessionStorage.getItem('dashcam_auth_token') || localStorage.getItem('dashcam_auth_token')
}

export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return ''
  const query = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&')
  return query ? `?${query}` : ''
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}csrf-token`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`CSRF token request failed: HTTP ${response.status}`)
  }

  const payload = await response.json()
  if (!payload || payload.result !== 0 || !payload.csrfToken) {
    throw new Error('CSRF token payload is invalid.')
  }

  csrfTokenCache = payload.csrfToken as string
  return csrfTokenCache
}

export async function ensureCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache
  return fetchCsrfToken()
}

// Làm mới CSRF token bắt buộc (dùng trước login)
export async function refreshCsrfToken(): Promise<string> {
  csrfTokenCache = null
  return fetchCsrfToken()
}

export function clearSecurityContext(): void {
  csrfTokenCache = null
}

function handleSessionExpired(message: string): void {
  setTimeout(() => {
    if (!authBridge) return
    if (authBridge.isAtLogin()) {
      // Nếu đang ở login rồi thì logout im lặng (chỉ để dọn dẹp storage)
      authBridge.logout()
    } else {
      authBridge.logout(message)
    }
  }, 0)
}

export async function fetchApi<T = ApiResponse>(
  action: string,
  params: Record<string, unknown> = {},
  method: string = 'GET',
): Promise<T> {
  const normalizedMethod = String(method || 'GET').toUpperCase()
  const jsession = getStoredToken()
  if (jsession && !params.jsession) {
    params.jsession = jsession
  }

  const csrfToken = await ensureCsrfToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=utf-8',
    'X-CSRF-Token': csrfToken,
  }

  if (jsession) {
    headers['Authorization'] = `Bearer ${jsession}`
  }

  const requestOptions: RequestInit & { headers: Record<string, string> } = {
    method: normalizedMethod,
    headers,
    credentials: 'include',
    cache: 'no-store',
  }

  let url = `${BASE_URL}${action}`
  if (normalizedMethod === 'GET') {
    // Cache-busting: thêm timestamp để ngăn browser/CDN trả 304 Not Modified
    params._t = Date.now()
    url = `${url}${buildQueryString(params)}`
  } else {
    requestOptions.body = JSON.stringify(params)
  }

  try {
    let response = await fetch(url, requestOptions)

    // Token hết hạn CSRF → lấy lại và retry một lần
    if (response.status === 403) {
      const refreshedToken = await fetchCsrfToken()
      requestOptions.headers['X-CSRF-Token'] = refreshedToken
      response = await fetch(url, requestOptions)
    }

    // Token JWT bị revoke hoặc hết hạn phía server → buộc logout
    if (response.status === 401) {
      console.warn(`[API] HTTP 401 từ ${action} — token bị revoke hoặc hết hạn.`)

      // Đừng tự động đăng xuất nếu lỗi đến từ background Face AI
      if (action.startsWith('face/')) {
        return { result: 401, msg: 'Session expired or revoked.' } as T
      }

      handleSessionExpired('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
      return { result: 5, msg: 'Session expired or revoked.' } as T
    }

    if (!response.ok) {
      console.warn(`[API WARN] HTTP ${response.status} from ${action}`)
      return { result: 99, msg: `HTTP Error ${response.status}` } as T
    }

    const data = await response.json()

    // Bắt lỗi phiên đăng nhập hết hạn từ Upstream (result = 5) mặc dù HTTP Status là 200
    if (data && (data.result === 5 || data.result === '5') && !action.startsWith('face/')) {
      console.warn(`[API] Upstream trả về result: 5 (Session expired) từ ${action}`)
      handleSessionExpired('Phiên làm việc trên máy chủ đã hết hạn. Vui lòng đăng nhập lại.')
      return { result: 5, msg: 'Session expired on upstream server.' } as T
    }

    return data as T
  } catch (error) {
    console.error(`[API FATAL] Lỗi fetch ${action}:`, error)
    const message = error instanceof Error ? error.message : String(error)
    return { result: 99, msg: `Fetch exception: ${message}` } as T
  }
}
