import { getUsername } from '../../shared/auth/session'
import { queryClient } from '../../shared/query/queryClient'
import { mapController } from '../map/mapController'
import type { Loose } from './lib'
import { liveviewVehiclesQueryOptions, loadDriverMapping } from './queries'
import { useLiveviewStore, type LeftTab, type RightTab } from './store'
import { createUnifiedPlayerIframe, stopKeepalive } from './streamController'
import { loadApiAiEvents, pollAiAlerts, startAiAlertPolling } from './aiQueries'
import { loadDriverInfoForWall } from './driverInfo'

// Phần điều phối của window.LiveViewModule (liveview.js:173-295, 985-1197).
// DOM do React render từ useLiveviewStore; các hàm dưới đây ghi store đúng như bản gốc ghi DOM.

const get = useLiveviewStore.getState
const set = useLiveviewStore.setState

const PICK_VEHICLE = 'Vui lòng chọn phương tiện từ danh sách để xem camera.'

// ── init (liveview.js:173-223) ──
let initStarted = false

/**
 * main.js:51-53 — LiveViewModule.init() ở lần showApp đầu. Bản gốc chỉ đặt isInitialized = true ở cuối
 * (sau await); bản port chặn ngay từ đầu để StrictMode không chạy hai lần.
 */
export async function initLiveview(): Promise<void> {
  if (initStarted) return
  initStarted = true

  await loadDriverMapping()
  // initRightPanelTabs, initDropdownToggles, các listener refresh/vehicle/company: gắn khi initialized = true
  startAiAlertPolling()
  initCompanyDropdown() // Khởi tạo dropdown nhóm quản lý trước
  // initTabs: cameraPanel.classList.add('active')
  set({ initialized: true, leftTab: 'camera' })
}

/** liveview.js:1014-1023 */
export function initCompanyDropdown(): void {
  const username = getUsername() || 'admin'
  set({ companyOptions: [username], companyValue: '' })
}

// ── Handler (chỉ chạy sau init, như listener của bản gốc) ──

/** liveview.js:208-218 — change #company-select-inner */
export function onCompanyChange(value: string): void {
  set({ companyValue: value })
  if (!get().initialized) return
  if (value) {
    void loadVehicleDropdown() // Chỉ tải xe khi đã chọn nhóm
  } else {
    // Clear vehicle list if unselected
    set({
      vehicleOptions: { kind: 'initial' },
      vehicleValue: '',
      grid: { kind: 'message', text: 'Vui lòng chọn nhóm quản lý trước.' },
    })
  }
}

/** liveview.js:200-202 — change #liveview-vehicle-select */
export function onVehicleChange(value: string): void {
  set({ vehicleValue: value })
  if (!get().initialized) return
  renderVehicleStreams(value)
}

/** liveview.js:189-195 — click #refresh-liveview */
export function onRefreshClick(): void {
  if (!get().initialized) return
  void loadVehicleDropdown()
  const value = get().vehicleValue
  if (value) {
    renderVehicleStreams(value)
  }
}

/** liveview.js:990-1006 (initTabs) — click .liveview-tabs .tab-btn */
export function onLeftTabClick(tab: LeftTab): void {
  if (!get().initialized) return
  set({ leftTab: tab })
  if (tab === 'map') {
    mapController.handleResize()
  }
}

/** liveview.js:261-278 (initRightPanelTabs) — click .right-tab-btn */
export function onRightTabClick(tab: RightTab): void {
  if (!get().initialized) return
  set({ rightTab: tab })
  if (tab === 'map-view') {
    setTimeout(() => {
      mapController.handleResize()
    }, 100)
  } else if (tab === 'ai-events') {
    void loadApiAiEvents()
  }
}

/** liveview.js:228-239 (initDropdownToggles) — click nút trong .icon-select-wrapper */
export function onDropdownButtonClick(id: 'sos'): void {
  if (!get().initialized) return
  set((s) => ({ openDropdown: s.openDropdown === id ? null : id }))
}

/** liveview.js:241-247 — click ngoài wrapper: đóng */
export function closeDropdown(): void {
  if (get().openDropdown !== null) set({ openDropdown: null })
}

// ── loadVehicleDropdown (liveview.js:1025-1070) ──
export async function loadVehicleDropdown(): Promise<void> {
  if (!get().vehicleValue) {
    set({ grid: { kind: 'message', text: PICK_VEHICLE } })
  }

  try {
    // Kiểm tra xem đã chọn nhóm quản lý chưa
    if (!get().companyValue) {
      return // Chưa chọn nhóm thì không tải xe
    }

    const data: Loose = await queryClient.fetchQuery(liveviewVehiclesQueryOptions())

    if (data && data.result === 0 && data.vehicles) {
      const vehicles: Loose[] = data.vehicles
      const currentValue = get().vehicleValue
      // option value = vehiclesCache.indexOf(vehicle) -> 0..n-1; khôi phục giá trị cũ nếu option còn tồn tại
      const n = Number(currentValue)
      const exists = currentValue !== '' && Number.isInteger(n) && String(n) === currentValue && n >= 0 && n < vehicles.length
      set({
        vehiclesCache: vehicles,
        vehicleOptions: { kind: 'list', vehicles },
        vehicleValue: currentValue && exists ? currentValue : '',
      })

      // Update AI alerts immediately after we have device list
      void pollAiAlerts()
    } else {
      set({ vehicleOptions: { kind: 'error' }, vehicleValue: '' })
    }
  } catch (error) {
    console.error('LiveView dropdown loading error:', error)
    set({ vehicleOptions: { kind: 'error' }, vehicleValue: '' })
  }
}

// ── renderVehicleStreams (liveview.js:1072-1125) ──
let playerSeq = 0

export function renderVehicleStreams(vehicleCacheIndex: string | null | undefined): void {
  set({ gridUnified: false })

  if (vehicleCacheIndex === null || vehicleCacheIndex === undefined || vehicleCacheIndex === '') {
    set({ gridUnified: true, grid: { kind: 'hint', text: PICK_VEHICLE, danger: false } })
    return
  }

  const vehicle = get().vehiclesCache[parseInt(vehicleCacheIndex)]
  if (!vehicle) {
    set({ gridUnified: true, grid: { kind: 'hint', text: 'Không tìm thấy thông tin phương tiện.', danger: true } })
    return
  }

  // AppHelpers.showLoader()/hideLoader() bao quanh phần đồng bộ: không hiển thị được (bỏ, xem MIGRATION_NOTES)
  try {
    set({ grid: { kind: 'empty' } })

    let hasVideo = false

    if (vehicle.dl && vehicle.dl.length > 0) {
      const mainDevice = vehicle.dl[0]
      const deviceId = mainDevice.id
      hasVideo = true
      set({ gridUnified: true })
      stopKeepalive()
      void renderUnifiedPlayer(vehicle.nm, deviceId, vehicle.vehiIdno || vehicle.nm || '')

      try {
        mapController.focusOnVehicle(deviceId)
      } catch (mapErr) {
        // Map sync lỗi không được làm fail luồng live stream.
        console.warn('Map focus failed (ignored):', mapErr)
      }
    }

    if (!hasVideo) {
      set({
        gridUnified: true,
        grid: { kind: 'hint', text: 'Phương tiện này không có thiết bị video nào được kết nối.', danger: false },
      })
    }
  } catch (err) {
    console.error('renderVehicleStreams failed:', err)
    set({
      gridUnified: true,
      grid: { kind: 'hint', text: 'Không thể tải luồng trực tiếp. Vui lòng thử lại.', danger: true },
    })
  }
}

// ── renderUnifiedPlayer (liveview.js:1127-1197) ──
/**
 * Dựng video wall (UnifiedPlayer render từ grid 'player'), gọi loadDriverInfoForWall, rồi tạo iframe.
 * Lời gọi cũ chưa xong khi đã chọn xe khác vẫn chạy tiếp và vẫn startKeepalive cho iframe không còn
 * trong DOM (như bản gốc: wall cũ đã bị gỡ khỏi grid).
 */
export async function renderUnifiedPlayer(vehicleName: string, deviceId: string, vehiIdno: string): Promise<void> {
  const token = ++playerSeq
  set({
    grid: { kind: 'player', token, vehicleName, deviceId, vehiIdno, iframe: null, failed: false },
  })
  void loadDriverInfoForWall(deviceId, token, vehiIdno)

  const isCurrent = () => {
    const g = get().grid
    return g.kind === 'player' && g.token === token
  }

  // Use fleetscontrol unified player: one iframe, internally can show 4 windows.
  const iframe = await createUnifiedPlayerIframe({ deviceId, vehicleName, vehiIdno }, (el) => {
    if (isCurrent()) set((s) => (s.grid.kind === 'player' ? { grid: { ...s.grid, iframe: el } } : s))
  })
  if (!iframe && isCurrent()) {
    set((s) => (s.grid.kind === 'player' ? { grid: { ...s.grid, failed: true } } : s))
  }
}

/** liveview.js:1157-1165 — click .video-tile */
export function onTileClick(deviceId: string): void {
  mapController.focusOnVehicle(deviceId)
  if (window.innerWidth <= 1024) {
    onLeftTabClick('map')
  }
}

/** Chỉ dùng trong test. */
export function resetLiveviewInit(): void {
  initStarted = false
  playerSeq = 0
}
