import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './app/router'
import { queryClient } from './shared/query/queryClient'
import './styles/index.css'

const router = createAppRouter()

// Devtools chỉ nạp ở DEV (devDependencies): build production không chứa mã devtools.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : null
const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-router-devtools').then((m) => ({ default: m.TanStackRouterDevtools })))
  : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {ReactQueryDevtools && TanStackRouterDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackRouterDevtools router={router} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  </StrictMode>,
)
