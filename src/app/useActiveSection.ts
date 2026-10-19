import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../shared/auth/authStore'

// main.js:1-3
export const VALID_ROUTES = [
  'dashboard',
  'liveview',
  'playback',
  'statistics',
  'map',
  'driver',
  'vehicle',
  'event-server',
  'settings',
  'login',
] as const
export const APP_ROUTES = [
  'dashboard',
  'liveview',
  'playback',
  'statistics',
  'map',
  'driver',
  'vehicle',
  'event-server',
  'settings',
] as const
export const DEFAULT_ROUTE = 'dashboard'

export type AppRoute = (typeof APP_ROUTES)[number]
export type ValidRoute = (typeof VALID_ROUTES)[number]

/** main.js Router.currentRoute: hash (không phân biệt hoa thường) -> route hợp lệ, ngược lại 'dashboard'. */
export function currentRoute(pathname: string): ValidRoute {
  const hash = pathname.replace(/^\//, '').toLowerCase()
  return (VALID_ROUTES as readonly string[]).includes(hash) ? (hash as ValidRoute) : DEFAULT_ROUTE
}

// ── onSectionShown: thay cho các lời gọi window.XModule.handleResize/resizeCharts/refresh
//    trong switchSection (main.js:160-174) và sidebar (main.js:84-97).
type SectionCallback = () => void
const sectionCallbacks = new Map<string, Set<SectionCallback>>()

/** Đăng ký callback chạy mỗi khi section `id` được hiển thị (sau 150 ms như bản gốc). Trả về hàm hủy. */
export function onSectionShown(id: AppRoute, cb: SectionCallback): () => void {
  let set = sectionCallbacks.get(id)
  if (!set) {
    set = new Set()
    sectionCallbacks.set(id, set)
  }
  set.add(cb)
  return () => {
    sectionCallbacks.get(id)?.delete(cb)
  }
}

/** Gọi ngay mọi callback đã đăng ký cho `id`. */
export function notifySectionShown(id: AppRoute): void {
  sectionCallbacks.get(id)?.forEach((cb) => cb())
}

// ── onNavItemClick: thay cho các listener click riêng mà module gắn lên `.nav-item[data-target=…]`
//    (vd. driver.js:1638-1653). Chạy ở MỌI lần click, kể cả click lại route đang active (không có hashchange).
const navClickCallbacks = new Map<string, Set<SectionCallback>>()

/** Đăng ký callback chạy đồng bộ mỗi khi nav item `id` được click. Trả về hàm hủy. */
export function onNavItemClick(id: AppRoute, cb: SectionCallback): () => void {
  let set = navClickCallbacks.get(id)
  if (!set) {
    set = new Set()
    navClickCallbacks.set(id, set)
  }
  set.add(cb)
  return () => {
    navClickCallbacks.get(id)?.delete(cb)
  }
}

/** Gọi ngay mọi callback click đã đăng ký cho nav item `id` (Sidebar gọi). */
export function notifyNavItemClick(id: AppRoute): void {
  navClickCallbacks.get(id)?.forEach((cb) => cb())
}

/**
 * Route đang active lấy từ router. Đồng thời chạy side effect của switchSection
 * (main.js:139-175): khi app đang hiển thị, 150 ms sau khi đổi section thì gọi các
 * callback `onSectionShown(id)`. Trạng thái nav `active`/`aria-current` và
 * `hidden` của section được tính khi render từ giá trị trả về.
 * Chỉ gọi hook này MỘT lần (trong AppShell) để side effect không bị nhân bản.
 */
export function useActiveSection(): AppRoute | 'login' {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const view = useAuthStore((s) => s.view)
  const active = currentRoute(pathname)

  useEffect(() => {
    if (view !== 'app' || active === 'login') return
    const timer = setTimeout(() => notifySectionShown(active), 150)
    return () => clearTimeout(timer)
  }, [active, view])

  return active
}
