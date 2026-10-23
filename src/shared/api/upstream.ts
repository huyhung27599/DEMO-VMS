import { buildQueryString, fetchApi } from './client'
import type { ApiResponse } from './client'

// Backend :4000 chỉ forward các action đã khai báo; action chưa có route thì gọi thẳng 808gps (CORS *).
export const UPSTREAM_BASE = 'http://119.17.211.170:8080/'

// Cache theo token backend: đăng nhập tài khoản khác thì tự lấy jsession mới.
let cache: { token: string | null; promise: Promise<string | null> } | null = null

function getUpstreamJsession(): Promise<string | null> {
  const token =
    sessionStorage.getItem('dashcam_auth_token') || localStorage.getItem('dashcam_auth_token')
  if (cache?.token === token) return cache.promise
  const promise = fetchApi('upstream-session').then((s) => {
    const j = typeof s?.upstreamJsession === 'string' ? s.upstreamJsession : null
    if (!j && cache?.promise === promise) cache = null
    return j
  })
  cache = { token, promise }
  return promise
}

export function clearUpstreamSession(): void {
  cache = null
}

async function callOnce(action: string, params: Record<string, unknown>): Promise<ApiResponse> {
  const jsession = await getUpstreamJsession()
  if (!jsession) return { result: 5, msg: 'Missing upstream session' }
  const url = `${UPSTREAM_BASE}${action}${buildQueryString({ ...params, jsession })}`
  // Không gửi credentials: server trả Access-Control-Allow-Origin: *.
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return { result: 99, msg: `HTTP Error ${response.status}` }
  return (await response.json()) as ApiResponse
}

export async function fetchUpstream(
  action: string,
  params: Record<string, unknown> = {},
): Promise<ApiResponse> {
  try {
    const res = await callOnce(action, params)
    if (res?.result !== 5 && res?.result !== '5') return res
    // jsession upstream hết hạn → lấy lại một lần
    clearUpstreamSession()
    return await callOnce(action, params)
  } catch (error) {
    console.error(`[UPSTREAM FATAL] Lỗi fetch ${action}:`, error)
    const message = error instanceof Error ? error.message : String(error)
    return { result: 99, msg: `Fetch exception: ${message}` }
  }
}
