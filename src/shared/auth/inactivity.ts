import { hasPersistentSession, isAuthenticated } from './session'

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000 // 1 giờ
const INACTIVITY_TIMEOUT_REMEMBER = 8 * 60 * 60 * 1000 // 8 giờ
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
const TIMEOUT_REASON = 'Phiên đăng nhập hết thời gian. Vui lòng đăng nhập lại.'

let timeoutId: ReturnType<typeof setTimeout> | null = null
let onTimeout: ((reason: string) => void) | null = null

// authStore đăng ký callback này (tránh import vòng giữa inactivity <-> authStore)
export function registerInactivityHandler(fn: (reason: string) => void): void {
  onTimeout = fn
}

function getInactivityTimeout(): number {
  return hasPersistentSession() ? INACTIVITY_TIMEOUT_REMEMBER : INACTIVITY_TIMEOUT_MS
}

export function resetActivityTimer(): void {
  if (!isAuthenticated()) return
  if (timeoutId !== null) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => {
    console.warn('[Auth] Tự động đăng xuất do không hoạt động.')
    onTimeout?.(TIMEOUT_REASON)
  }, getInactivityTimeout())
}

export function setupActivityListeners(): void {
  ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetActivityTimer, { passive: true }))
}

// Giữ nguyên bản gốc: chỉ hủy timer, KHÔNG gỡ listener
export function teardownActivityListeners(): void {
  if (timeoutId !== null) clearTimeout(timeoutId)
  timeoutId = null
}
