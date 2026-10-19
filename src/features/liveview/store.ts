import { create } from 'zustand'
import type { Loose } from './lib'

// Trạng thái UI của #liveview-section (thay cho DOM mà liveview.js đọc/ghi trực tiếp).

/** Option của #liveview-vehicle-select (liveview.js gán innerHTML). */
export type VehicleOptionsView =
  /** index.html / xóa nhóm: một option "Chọn phương tiện" */
  | { kind: 'initial' }
  /** tải xong: "Chọn phương tiện..." + mỗi xe một option value = chỉ số trong vehiclesCache */
  | { kind: 'list'; vehicles: Loose[] }
  /** "Lỗi tải danh sách" */
  | { kind: 'error' }

/** Nội dung #video-grid. */
export type GridView =
  /** index.html: rỗng */
  | { kind: 'empty' }
  /** div căn giữa màu muted (loadVehicleDropdown / bỏ chọn nhóm) */
  | { kind: 'message'; text: string }
  /** .video-wall > .video-wall-hint (renderVehicleStreams) */
  | { kind: 'hint'; text: string; danger: boolean }
  /** renderUnifiedPlayer: một video wall. `iframe` = player đã gắn vào .video-tile; `failed` = "Stream Not Available" */
  | {
      kind: 'player'
      token: number
      vehicleName: string
      deviceId: string
      vehiIdno: string
      iframe: HTMLIFrameElement | null
      failed: boolean
    }

export type LeftTab = 'camera' | 'map'
export type RightTab = 'map-view' | 'ai-events'

export type LiveviewState = {
  /** init() đã chạy xong (sau `await loadDriverMapping()`): các listener click/change đã được gắn */
  initialized: boolean
  /** #company-select-inner: [] = chỉ option "Chọn nhóm quản lý" (index.html); initCompanyDropdown thêm username */
  companyOptions: string[]
  companyValue: string
  vehicleOptions: VehicleOptionsView
  /** giá trị của #liveview-vehicle-select ('' hoặc chỉ số trong vehiclesCache) */
  vehicleValue: string
  /** biến `vehiclesCache` của module */
  vehiclesCache: Loose[]
  grid: GridView
  /** class `is-unified` của #video-grid (chỉ renderVehicleStreams đổi) */
  gridUnified: boolean
  /** panel trái/phải có class `active` (initTabs). null = trước initTabs (chưa panel nào active) */
  leftTab: LeftTab | null
  /** tab phải đang active (.right-tab-btn / .right-tab-content) */
  rightTab: RightTab
  /** .icon-select-wrapper đang `open` */
  openDropdown: 'sos' | null
}

const INITIAL: LiveviewState = {
  initialized: false,
  companyOptions: [],
  companyValue: '',
  vehicleOptions: { kind: 'initial' },
  vehicleValue: '',
  vehiclesCache: [],
  grid: { kind: 'empty' },
  gridUnified: false,
  leftTab: null,
  rightTab: 'map-view',
  openDropdown: null,
}

export const useLiveviewStore = create<LiveviewState>(() => ({ ...INITIAL }))

/** Chỉ dùng trong test. */
export function resetLiveviewStore(): void {
  useLiveviewStore.setState({ ...INITIAL })
}
