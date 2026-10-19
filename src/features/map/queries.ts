import { queryOptions } from '@tanstack/react-query'
import { fetchOnce } from './mapController'

export const mapKeys = {
  all: ['map'] as const,
  vehiclePositions: ['map', 'vehiclePositions'] as const,
}

// map.js:171-174 startTracking: _fetchOnce() ngay + setInterval(_fetchOnce, 1500).
// Query bật khi useModuleEnabled('map') && trackingActive (init -> startTracking); mount/enable
// không có dữ liệu -> fetch ngay (lần gọi tức thì), rồi refetchInterval 1500 ms.
// stopTracking (fetchOnce khi chưa đăng nhập) đặt trackingActive = false -> dừng hẳn.
export function vehiclePositionsQueryOptions() {
  return queryOptions({
    queryKey: mapKeys.vehiclePositions,
    queryFn: async (): Promise<null> => {
      await fetchOnce()
      return null
    },
    refetchInterval: 1500,
    refetchIntervalInBackground: true,
  })
}
