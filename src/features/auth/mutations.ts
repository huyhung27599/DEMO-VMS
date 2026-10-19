import { useMutation } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { refreshCsrfToken } from '../../shared/api/client'
import { authActions } from '../../shared/auth/authStore'
import { clearAuthStorage, saveAuthSession } from '../../shared/auth/session'
import { showToast } from '../../shared/ui/toastStore'

/** Thông báo lỗi giống `err.message || fallback` của bản gốc. */
export function errorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : ''
  return msg || fallback
}

// ── Login (auth.js:160-212, phần gọi API nằm trong authActions.login) ─────────
export type LoginVars = { username: string; password: string; rememberMe: boolean }

export function useLoginMutation() {
  return useMutation({
    mutationFn: ({ username, password, rememberMe }: LoginVars) => authActions.login(username, password, rememberMe),
  })
}

// ── Reset request (auth.js:236-284) ───────────────────────────────────────────
export async function handleResetRequest(account: string): Promise<unknown> {
  const response = await fetch('/api/reset-password-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // auth.js:260 gọi ApiModule.getSecurityContext?.() — hàm không tồn tại, nên luôn là "" (Ruling R7)
      'X-CSRF-Token': '',
    },
    body: JSON.stringify({ account }),
  })
  const data = await response.json()
  if (data.result === 0) return data
  throw new Error(data.msg || 'Không thể gửi yêu cầu.')
}

export function useResetRequestMutation() {
  return useMutation({ mutationFn: (account: string) => handleResetRequest(account) })
}

// ── Change password, đã đăng nhập (auth.js:307-357) ─────────────────────────
export async function handleChangePasswordAuth(oldPassword: string, newPassword: string): Promise<void> {
  const changeData = await api.changePassword(oldPassword, newPassword)
  if (!(changeData && changeData.result === 0)) {
    throw new Error((changeData?.msg as string | undefined) || 'Đổi mật khẩu thất bại.')
  }
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      handleChangePasswordAuth(oldPassword, newPassword),
    onSuccess: () => {
      showToast('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.', 'success')
      setTimeout(() => void authActions.logout(), 1500)
    },
  })
}

// ── Forgot password bằng mật khẩu cũ (auth.js:380-447) ──────────────────────
export type ForgotPasswordVars = { username: string; oldPassword: string; newPassword: string; rememberMe: boolean }

export async function handleForgotPasswordSubmit({
  username,
  oldPassword,
  newPassword,
  rememberMe,
}: ForgotPasswordVars): Promise<void> {
  await refreshCsrfToken()

  const loginData = await api.login(username, oldPassword)
  if (!(loginData && loginData.result === 0 && loginData.jsession)) {
    throw new Error((loginData?.msg as string | undefined) || 'Mật khẩu cũ không đúng.')
  }

  saveAuthSession(loginData.jsession as string, (loginData.account_name as string) || username, rememberMe)

  const changeData = await api.changePassword(oldPassword, newPassword)
  if (!(changeData && changeData.result === 0)) {
    throw new Error((changeData?.msg as string | undefined) || 'Đổi mật khẩu thất bại.')
  }

  clearAuthStorage()
}

export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: (vars: ForgotPasswordVars) => handleForgotPasswordSubmit(vars) })
}
