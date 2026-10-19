import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import type { Loose } from './lib'
import { usePlaybackStore } from './store'

export const playbackKeys = {
  all: ['playback'] as const,
  vehicles: ['playback', 'vehicles'] as const,
}

/**
 * playback.js:477-493 loadVehicleDropdown — phần mạng. "Đang tải..." / "Lỗi tải danh sách" / danh sách option
 * được suy ra từ trạng thái query (components/SearchForm.tsx). Lỗi: `_vehiclesCache` giữ nguyên.
 */
export async function loadVehicleDropdown(): Promise<Loose[]> {
  try {
    const res: Loose = await api.queryUserVehicle()
    if (!res || res.result !== 0 || !res.vehicles) throw new Error('bad response')
    usePlaybackStore.setState({ vehiclesCache: res.vehicles })
    return res.vehicles
  } catch (e) {
    console.error('[Playback] vehicle dropdown error:', e)
    throw e
  }
}

/**
 * Bản gốc tải danh sách xe đúng một lần trong init() (có guard _isInitialized), không có timer:
 * `enabled` = store.vehicleDropdownEnabled (playbackInit bật), staleTime Infinity để không tải lại khi mount/đăng nhập lại.
 */
export const playbackVehiclesQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: playbackKeys.vehicles,
    queryFn: loadVehicleDropdown,
    enabled,
    staleTime: Infinity,
    refetchInterval: false,
  })
