import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import type { ApiResponse } from '../../shared/api/types'
import { queryClient } from '../../shared/query/queryClient'

export const liveviewKeys = {
  all: ['liveview'] as const,
  // Key riêng: không gộp với driver/mapping của dashboard/driver (bản gốc gọi trùng)
  driverMapping: ['liveview', 'driverMapping'] as const,
  vehicles: ['liveview', 'vehicles'] as const,
}

/**
 * liveview.js:20-30 loadDriverMapping — fetch thẳng `${BASE_URL}driver/mapping` (không header, không qua fetchApi).
 * Lỗi -> giữ `{}` (giá trị khởi tạo của biến `driverMapping`). Chỉ nạp một lần trong init()
 * (initLiveview, chạy khi useModuleEnabled('liveview')) — không có useQuery tự fetch lúc mount.
 */
export function liveviewDriverMappingQueryOptions() {
  return queryOptions({
    queryKey: liveviewKeys.driverMapping,
    queryFn: async (): Promise<Record<string, string>> => {
      let driverMapping: Record<string, string> = {}
      try {
        const res = await fetch(`${api.BASE_URL}driver/mapping`)
        if (res.ok) {
          driverMapping = await res.json()
          console.log('[LiveView] Driver mapping loaded:', Object.keys(driverMapping).length, 'drivers.')
        }
      } catch (e) {
        console.warn('[LiveView] Could not load driver mapping:', e)
      }
      return driverMapping
    },
    staleTime: Infinity,
  })
}

/** init(): `await loadDriverMapping()` */
export async function loadDriverMapping(): Promise<void> {
  await queryClient.fetchQuery(liveviewDriverMappingQueryOptions())
}

/** Biến `driverMapping` của module (Task 11: renderDriverInfo / renderAiEvents đọc). */
export function getDriverMapping(): Record<string, string> {
  return queryClient.getQueryData(liveviewKeys.driverMapping) ?? {}
}

/**
 * Lời gọi API của loadVehicleDropdown (liveview.js:1041). Không tự fetch lúc mount: chỉ
 * loadVehicleDropdown() (đổi nhóm quản lý / nút "Làm mới") gọi qua fetchQuery, staleTime 0 -> mỗi lần đều gọi API.
 */
export function liveviewVehiclesQueryOptions() {
  return queryOptions({
    queryKey: liveviewKeys.vehicles,
    queryFn: (): Promise<ApiResponse> => api.queryUserVehicle(),
    staleTime: 0,
  })
}
