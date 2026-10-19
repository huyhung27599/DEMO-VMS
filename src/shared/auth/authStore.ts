import { create } from 'zustand'
import { api } from '../api/endpoints'
import { clearSecurityContext, refreshCsrfToken, registerAuthBridge } from '../api/client'
import { sanitizeHTML } from '../lib/sanitize'
import {
  registerInactivityHandler,
  resetActivityTimer,
  setupActivityListeners,
  teardownActivityListeners,
} from './inactivity'
import { clearAuthStorage, isAuthenticated, saveAuthSession } from './session'

export type AuthState = {
  view: 'login' | 'app'
  username: string
  logoutReason: string
  hasShownApp: boolean
}

export const useAuthStore = create<AuthState>(() => ({
  view: 'login',
  username: '',
  logoutReason: '',
  hasShownApp: false,
}))

export type LoginResult = { ok: true } | { ok: false; error: string }

export const authActions = {
  showApp(username: string): void {
    useAuthStore.setState({ view: 'app', username, logoutReason: '', hasShownApp: true })
  },

  showLogin(reason: string = ''): void {
    useAuthStore.setState({ view: 'login', logoutReason: reason })
  },

  async login(username: string, password: string, rememberMe: boolean): Promise<LoginResult> {
    if (!username || !password) {
      return { ok: false, error: 'Vui lòng nhập tài khoản và mật khẩu.' }
    }
    try {
      await refreshCsrfToken()
      const data = await api.login(username, password)
      if (data.result === 0 && data.jsession) {
        const name = (data.account_name as string) || username
        saveAuthSession(data.jsession as string, name, rememberMe)
        authActions.showApp(sanitizeHTML(name))
        setupActivityListeners()
        resetActivityTimer()
        return { ok: true }
      }
      const serverMsg = data && data.msg ? String(data.msg) : ''
      throw new Error(serverMsg || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      return { ok: false, error: message || 'Đăng nhập thất bại.' }
    }
  },

  async logout(reason: string = ''): Promise<void> {
    teardownActivityListeners()
    try {
      if (isAuthenticated()) {
        await api.logout()
      }
    } catch (e) {
      console.warn('[Auth] Logout request failed:', e instanceof Error ? e.message : e)
    } finally {
      clearAuthStorage()
      clearSecurityContext()
      authActions.showLogin(reason)
    }
  },
}

registerInactivityHandler((reason) => {
  void authActions.logout(reason)
})
registerAuthBridge({
  isAtLogin: () => useAuthStore.getState().view === 'login',
  logout: (reason) => {
    void authActions.logout(reason)
  },
})
