import { queryOptions } from '@tanstack/react-query'
import { pollRealtimeAlarms, refresh } from './loaders'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  refresh: ['dashboard', 'refresh'] as const,
  realtimeAlarms: ['dashboard', 'realtimeAlarms'] as const,
}

// dashboard.js:739-752. setInterval(refresh, 120_000); lần nạp đầu chỉ chạy khi đã đăng nhập
// (chưa đăng nhập: chờ 'auth-success', ở bản mới là refetchQueries(['dashboard']) trong RootLayout).
// initialData + staleTime: Infinity: query không tự fetch khi mount; lần nạp đầu do initDashboard() chạy
// trực tiếp (không qua query, để không bị gộp/hủy với refetchQueries của RootLayout). refetchInterval vẫn chạy.
export function dashboardRefreshQueryOptions() {
  return queryOptions({
    queryKey: dashboardKeys.refresh,
    queryFn: async (): Promise<null> => {
      await refresh()
      return null
    },
    initialData: null,
    staleTime: Infinity,
    refetchInterval: 120_000,
    refetchIntervalInBackground: true,
  })
}

// dashboard.js:743-745. setInterval(pollRealtimeAlarms, 60_000); không có lần nạp đầu riêng.
export function realtimeAlarmsQueryOptions() {
  return queryOptions({
    queryKey: dashboardKeys.realtimeAlarms,
    queryFn: async (): Promise<null> => {
      await pollRealtimeAlarms()
      return null
    },
    initialData: null,
    staleTime: Infinity,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  })
}
