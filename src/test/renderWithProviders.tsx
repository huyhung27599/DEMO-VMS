import { StrictMode, type ReactNode } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRouter,
  type RouterHistory,
} from '@tanstack/react-router'
import { createQueryClient } from '../shared/query/queryClient'
import { createAppRouter } from '../app/router'
import { createLegacyHashHistory } from '../app/legacyHashHistory'

export type ProvidersResult = RenderResult & { queryClient: QueryClient; router: AnyRouter }

/**
 * Render `ui` trong QueryClientProvider (client mới, cùng default) và một router
 * test dùng `createMemoryHistory` (mọi path đều khớp route splat `$`).
 * Nội dung xuất hiện sau khi router load xong: dùng `findBy*` hoặc tiến timer.
 */
export function renderWithProviders(
  ui: ReactNode,
  { route = '/', strict = false }: { route?: string; strict?: boolean } = {},
): ProvidersResult {
  const queryClient = createQueryClient()
  const rootRoute = createRootRoute({
    component: () => (
      <>
        {ui}
        <Outlet />
      </>
    ),
  })
  const splat = createRoute({ getParentRoute: () => rootRoute, path: '$', component: () => null })
  const router = createRouter({
    routeTree: rootRoute.addChildren([splat]),
    history: createMemoryHistory({ initialEntries: [route] }),
  })
  const tree = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const result = render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  return { ...result, queryClient, router: router as unknown as AnyRouter }
}

export type AppResult = RenderResult & { queryClient: QueryClient; history: RouterHistory; router: AnyRouter }

/** Render toàn bộ app (router thật + legacy hash history trên `window` của jsdom). */
export function renderApp({ hash = '', strict = false }: { hash?: string; strict?: boolean } = {}): AppResult {
  window.history.replaceState(null, '', '/' + hash)
  const history = createLegacyHashHistory()
  const router = createAppRouter({ history })
  const queryClient = createQueryClient()
  const tree = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const result = render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  return { ...result, queryClient, history, router: router as unknown as AnyRouter }
}
