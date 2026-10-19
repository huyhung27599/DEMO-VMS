import { QueryClient } from '@tanstack/react-query'

// Factory dùng chung để test tạo QueryClient mới với cùng default.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export const queryClient = createQueryClient()
