import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const bridgeRef = vi.hoisted(() => ({
  current: null as null | { isAtLogin(): boolean; logout(reason?: string): void },
}))

vi.mock('../api/client', () => ({
  refreshCsrfToken: vi.fn(),
  clearSecurityContext: vi.fn(),
  registerAuthBridge: vi.fn((b) => {
    bridgeRef.current = b
  }),
  fetchApi: vi.fn(),
}))
vi.mock('../api/endpoints', () => ({ api: { login: vi.fn(), logout: vi.fn() } }))

import { clearSecurityContext, refreshCsrfToken } from '../api/client'
import { api } from '../api/endpoints'
import { authActions, useAuthStore } from './authStore'
import { resetActivityTimer } from './inactivity'
import { sanitizeHTML } from '../lib/sanitize'
import { queryClient } from '../query/queryClient'
import { getToken, saveAuthSession } from './session'

const KEYS = ['dashcam_auth_token', 'dashcam_auth_user', 'dashcam_auth_remember', 'dashcam_auth_remember_exp']
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  useAuthStore.setState({ view: 'login', username: '', logoutReason: '', hasShownApp: false })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('session', () => {
  it('remember true writes localStorage', () => {
    saveAuthSession('t', 'u', true)
    expect(localStorage.getItem('dashcam_auth_token')).toBe('t')
    expect(localStorage.getItem('dashcam_auth_user')).toBe('u')
    expect(localStorage.getItem('dashcam_auth_remember')).toBe('1')
    expect(localStorage.getItem('dashcam_auth_remember_exp')).toBe(String(Date.now() + 2592000000))
  })
  it('remember false writes sessionStorage', () => {
    saveAuthSession('t', 'u', false)
    expect(sessionStorage.getItem('dashcam_auth_token')).toBe('t')
    expect(localStorage.getItem('dashcam_auth_remember')).toBeNull()
  })
  it('expired remember clears all keys', () => {
    saveAuthSession('t', 'u', true)
    sessionStorage.setItem('dashcam_auth_user', 'x')
    vi.setSystemTime(Date.now() + 2592000001)
    expect(getToken()).toBeNull()
    KEYS.forEach((k) => {
      expect(localStorage.getItem(k)).toBeNull()
      expect(sessionStorage.getItem(k)).toBeNull()
    })
  })
  it('expired JWT -> null and cleared; non-JWT returned as is', () => {
    const exp = Math.floor(Date.now() / 1000) - 10
    saveAuthSession(`h.${b64({ exp })}.s`, 'u', false)
    expect(getToken()).toBeNull()
    expect(sessionStorage.getItem('dashcam_auth_token')).toBeNull()
    saveAuthSession('plain-token', 'u', false)
    expect(getToken()).toBe('plain-token')
  })
})

describe('inactivity', () => {
  it('logs out after 1h (no remember)', async () => {
    vi.mocked(api.logout).mockResolvedValue({ result: 0 })
    saveAuthSession('t', 'u', false)
    resetActivityTimer()
    await vi.advanceTimersByTimeAsync(3_599_999)
    expect(api.logout).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.logout).toHaveBeenCalled()
    expect(useAuthStore.getState().logoutReason).toBe(
      'Phiên đăng nhập hết thời gian. Vui lòng đăng nhập lại.',
    )
  })
  it('8h with remember', async () => {
    vi.mocked(api.logout).mockResolvedValue({ result: 0 })
    saveAuthSession('t', 'u', true)
    resetActivityTimer()
    await vi.advanceTimersByTimeAsync(28_799_999)
    expect(api.logout).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.logout).toHaveBeenCalled()
  })
})

describe('authActions.login', () => {
  it('empty username -> error, no API', async () => {
    expect(await authActions.login('', 'x', false)).toEqual({
      ok: false,
      error: 'Vui lòng nhập tài khoản và mật khẩu.',
    })
    expect(api.login).not.toHaveBeenCalled()
  })
  it('success', async () => {
    const order: string[] = []
    vi.mocked(refreshCsrfToken).mockImplementation(async () => {
      order.push('csrf')
      return 'c'
    })
    vi.mocked(api.login).mockImplementation(async () => {
      order.push('login')
      return { result: 0, jsession: 'j', account_name: 'A' }
    })
    expect(await authActions.login('u', 'p', false)).toEqual({ ok: true })
    expect(order).toEqual(['csrf', 'login'])
    expect(sessionStorage.getItem('dashcam_auth_token')).toBe('j')
    expect(sessionStorage.getItem('dashcam_auth_user')).toBe('A')
    const s = useAuthStore.getState()
    expect(s.view).toBe('app')
    expect(s.username).toBe('A')
    expect(s.hasShownApp).toBe(true)
    // timer attached: fires after 1h
    vi.mocked(api.logout).mockResolvedValue({ result: 0 })
    await vi.advanceTimersByTimeAsync(3_600_000)
    expect(api.logout).toHaveBeenCalled()
  })
  it('failure uses msg or default', async () => {
    vi.mocked(api.login).mockResolvedValue({ result: 1, msg: 'Sai' })
    expect(await authActions.login('u', 'p', false)).toEqual({ ok: false, error: 'Sai' })
    vi.mocked(api.login).mockResolvedValue({ result: 1 })
    expect(await authActions.login('u', 'p', false)).toEqual({
      ok: false,
      error: 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
    })
  })
  it('empty password -> error, no API', async () => {
    expect(await authActions.login('u', '', false)).toEqual({
      ok: false,
      error: 'Vui lòng nhập tài khoản và mật khẩu.',
    })
    expect(api.login).not.toHaveBeenCalled()
  })
  it('thrown empty-message error -> fallback', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error(''))
    expect(await authActions.login('u', 'p', false)).toEqual({
      ok: false,
      error: 'Đăng nhập thất bại.',
    })
  })
  it('rememberMe true stores in localStorage', async () => {
    vi.mocked(api.login).mockResolvedValue({ result: 0, jsession: 'j', account_name: 'A' })
    expect(await authActions.login('u', 'p', true)).toEqual({ ok: true })
    expect(localStorage.getItem('dashcam_auth_token')).toBe('j')
    expect(localStorage.getItem('dashcam_auth_remember')).toBe('1')
  })
  it('thrown error -> message', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('boom'))
    expect(await authActions.login('u', 'p', false)).toEqual({ ok: false, error: 'boom' })
  })
})

describe('authActions.logout', () => {
  it('calls api.logout only when authenticated, clears, keeps hasShownApp, no query clear', async () => {
    const clearSpy = vi.spyOn(queryClient, 'clear')
    vi.mocked(api.logout).mockResolvedValue({ result: 0 })
    saveAuthSession('t', 'u', false)
    authActions.showApp('u')
    await authActions.logout('lý do')
    expect(api.logout).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('dashcam_auth_token')).toBeNull()
    expect(clearSecurityContext).toHaveBeenCalled()
    const s = useAuthStore.getState()
    expect(s.view).toBe('login')
    expect(s.logoutReason).toBe('lý do')
    expect(s.hasShownApp).toBe(true)
    expect(clearSpy).not.toHaveBeenCalled()

    await authActions.logout('again')
    expect(api.logout).toHaveBeenCalledTimes(1)
  })
  it('swallows api.logout errors', async () => {
    vi.mocked(api.logout).mockRejectedValue(new Error('x'))
    saveAuthSession('t', 'u', false)
    await authActions.logout('r')
    expect(useAuthStore.getState().view).toBe('login')
  })
})

describe('auth bridge', () => {
  it('is registered at import and tracks view', async () => {
    const bridge = bridgeRef.current!
    expect(bridge).not.toBeNull()
    expect(bridge.isAtLogin()).toBe(true)
    authActions.showApp('u')
    expect(bridge.isAtLogin()).toBe(false)
    vi.mocked(api.logout).mockResolvedValue({ result: 0 })
    saveAuthSession('t', 'u', false)
    bridge.logout('r')
    await vi.advanceTimersByTimeAsync(0)
    expect(api.logout).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().logoutReason).toBe('r')
    expect(bridge.isAtLogin()).toBe(true)
  })
})

describe('sanitizeHTML', () => {
  it('escapes', () => {
    expect(sanitizeHTML('<b>&')).toBe('&lt;b&gt;&amp;')
  })
})
