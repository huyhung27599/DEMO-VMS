import { useAuthStore } from '../../shared/auth/authStore'
import { isAuthenticated } from '../../shared/auth/session'
import { refresh } from './loaders'

// dashboard.js:747-753 — nạp đầu trong init():
//  - đã đăng nhập: refresh() ngay (và showApp -> loadDashboardData gọi thêm lần nữa: RootLayout refetchQueries);
//  - chưa đăng nhập: listener 'auth-success' { once: true } gọi refresh() (cộng với loadDashboardData của showApp).
// Gọi trực tiếp refresh() (không qua query) để hai lần chạy không bị gộp/hủy như refetchQueries.
let initialized = false
let stopWaiting: (() => void) | null = null

export function initDashboard(): void {
  if (initialized) return // StrictMode chạy effect hai lần
  initialized = true
  if (isAuthenticated()) {
    void refresh()
    return
  }
  const unsubscribe = useAuthStore.subscribe((s) => {
    if (s.view === 'app') {
      unsubscribe()
      stopWaiting = null
      void refresh()
    }
  })
  stopWaiting = unsubscribe
}

/** Chỉ dùng trong test. */
export function resetDashboardInit(): void {
  stopWaiting?.()
  stopWaiting = null
  initialized = false
}
