import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { createAppRouter } from './app/router'
import { queryClient } from './shared/query/queryClient'
import './styles/index.css'

const router = createAppRouter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV ? (
        <>
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackRouterDevtools router={router} />
        </>
      ) : null}
    </QueryClientProvider>
  </StrictMode>,
)
