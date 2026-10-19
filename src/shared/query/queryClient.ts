import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 0 },
    mutations: { retry: false },
  },
})
