import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import { authActions, useAuthStore } from '../shared/auth/authStore'
import { isAuthenticated } from '../shared/auth/session'
import { createLegacyHashHistory } from './legacyHashHistory'
import { RootLayout } from './RootLayout'
import { APP_ROUTES, VALID_ROUTES } from './useActiveSection'

// Router của main.js (VALID_ROUTES, hashchange -> showLogin khi chưa đăng nhập).

/** Router.init (main.js:177-188): chưa đăng nhập -> showLogin() + thay URL bằng #login. */
function redirectToLogin(): never {
  // Token hết hạn giữa phiên: bản gốc gọi showLogin() (không gọi API logout, không lý do)
  if (useAuthStore.getState().view === 'app') authActions.showLogin()
  throw redirect({ to: '/login', replace: true })
}

function requireAuth(): void {
  if (!isAuthenticated()) redirectToLogin()
}

function isKnownPath(pathname: string): boolean {
  const p = pathname.toLowerCase()
  return p === '/' || (VALID_ROUTES as readonly string[]).some((r) => p === `/${r}`)
}

const rootRoute = createRootRoute({
  component: RootLayout,
  // Dự phòng: guard ở beforeLoad bên dưới đã chuyển hướng mọi path không hợp lệ.
  notFoundComponent: () => <Navigate to="/dashboard" replace />,
  // Hash không hợp lệ (vd. '#xyz', '#/dashboard'): currentRoute() trả 'dashboard' ở bản gốc.
  // Chưa đăng nhập -> '#login' (replace, history.length không đổi); đã đăng nhập -> '#dashboard'.
  beforeLoad: ({ location }) => {
    if (isKnownPath(location.pathname)) return
    requireAuth()
    throw redirect({ to: '/dashboard' })
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null,
  // main.js:77-80: hash rỗng -> Router.navigate('dashboard')
  beforeLoad: () => {
    requireAuth()
    throw redirect({ to: '/dashboard' })
  },
})

const appRoutes = APP_ROUTES.map((route) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: route,
    component: () => null,
    beforeLoad: requireAuth,
  }),
)

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'login',
  component: () => null,
  // Router.init: đã đăng nhập mà vào #login -> Router.navigate(DEFAULT_ROUTE)
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: '/dashboard' })
  },
})

const routeTree = rootRoute.addChildren([indexRoute, ...appRoutes, loginRoute])

export function createAppRouter(opts?: { history?: RouterHistory }) {
  return createRouter({
    routeTree,
    history: opts?.history ?? createLegacyHashHistory(),
    caseSensitive: false,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
