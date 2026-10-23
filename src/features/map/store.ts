import { create } from 'zustand'
import type { DeviceStatus } from './lib'

// Trạng thái dùng chung của MapModule (map.js:3-11) mà React cần đọc.
export type MapState = {
  /** `selectedVehicleId` — xe đang focus (liveview gọi focusOnVehicle) */
  followTarget: string | null
  /** `followMode` — mặc định bật; dragstart trên bản đồ tắt */
  followMode: boolean
  /** `_pollTimer !== null` — startTracking bật, stopTracking tắt */
  trackingActive: boolean
  /** `isInitialized` của MapModule (ẩn placeholder trong container) */
  isInitialized: boolean
  /** Khung "icon-settings" vừa bật/tắt bằng toggleIconSettings đang mở */
  iconSettingsOpen: boolean
  /** Bản sao lastValidStatuses để sidebar React đọc (poll GPS) */
  statuses: DeviceStatus[]
  /** Bộ lọc UI sidebar */
  listQuery: string
  listCompany: string
  listStatus: 'all' | 'online' | 'alert' | 'offline'
  filtersOpen: boolean
}

const INITIAL: MapState = {
  followTarget: null,
  followMode: true, // Luôn bật follow mặc định
  trackingActive: false,
  isInitialized: false,
  iconSettingsOpen: false,
  statuses: [],
  listQuery: '',
  listCompany: '',
  listStatus: 'all',
  filtersOpen: false,
}

export const useMapStore = create<MapState>(() => ({ ...INITIAL }))

/** Chỉ dùng trong test. */
export function resetMapStore(): void {
  useMapStore.setState({ ...INITIAL })
}
