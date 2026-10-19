import { localDt } from './lib'
import { usePlaybackStore } from './store'
import { bindTrackMapEvents } from './trackMapController'

// playback.js:402-412 PlaybackModule.init — gọi từ RootLayout mỗi lần showApp (main.js:60-62) và một lần
// ở lần đăng nhập đầu (LoginScreen, playback.js:1955). Guard _isInitialized như bản gốc (Ruling R4).
// Lưu ý: AppShell.test/lifecycle.test mock module này chỉ với `playbackInit` — không export thêm gì cần cho render.

let isInitialized = false

export function playbackInit(): void {
  if (isInitialized) return
  isInitialized = true
  const now = new Date()
  usePlaybackStore.setState({
    beginTime: localDt(now),
    endTime: localDt(now, true),
    // loadVehicleDropdown(): bật query danh sách xe (queries.ts)
    vehicleDropdownEnabled: true,
    // bindEvents(): onClick của #pb-search-btn / #pb-map-fullscreen-btn / #pb-track-play-btn
    initialized: true,
  })
  // bindEvents(): fullscreenchange (4 biến thể) + keydown Escape trên document
  bindTrackMapEvents()
}

/** Chỉ dùng trong test. */
export function resetPlaybackInit(): void {
  isInitialized = false
}
