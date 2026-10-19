import { create } from 'zustand'
import type { Loose } from './lib'

// Trạng thái của #playback-section: biến module của playback.js (1-15) + DOM mà playback.js đọc/ghi trực tiếp.

/** File video sau khi chuẩn hoá trong loadVideoFiles (playback.js:612-620). */
export type PlaybackFile = Loose & {
  _channel: string
  _beginNorm: string
  _endNorm: string
  _downUrl: string
  _playbackUrl: string
  _streamUrl: string
}

/** Callback lỗi của injectVideo (onFailure). */
export type VideoFailureHandler = ((err: Loose) => void) | null

/** Nội dung #pb-player-area (bản gốc gán area.innerHTML / appendChild). */
export type PlayerView =
  /** index.html: "Chọn phương tiện và khoảng thời gian..." */
  | { kind: 'initial' }
  /** .pb-player-placeholder + spinner + text */
  | { kind: 'loading'; text: string }
  /** injectIframe: `id` tăng mỗi lần để iframe mới luôn được tạo lại như innerHTML='' + appendChild */
  | { kind: 'iframe'; id: number; src: string; referrer?: string }
  /** injectVideo */
  | { kind: 'video'; id: number; url: string; onFailure: VideoFailureHandler; codecWarning: string | null }
  /** v.onerror khi không có onFailure (playback.js:283-299) */
  | { kind: 'mediaError'; errCode: number | string; hint: string }
  /** showUnifiedPlaybackPlayer lỗi (playback.js:580-584) */
  | { kind: 'unifiedError'; message: string }
  /** probe proxy thất bại, không có fallback (playback.js:858-865) */
  | { kind: 'probeError'; title: string; detail: string }
  /** video lỗi và fallback chain thất bại (playback.js:1023-1031) */
  | { kind: 'playError'; code: Loose; pUrl: string }
  /** mọi cách đều thất bại (playback.js:1055-1060) */
  | { kind: 'unsupported'; devId: string; channel: string; begin: string }

/** Nội dung #pb-filelist-body (loadVideoFiles). */
export type FileListView =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'table'; files: PlaybackFile[]; vehicle: Loose; beginFmt: string; endFmt: string; streamType: string }

/** #pb-channel-tabs (renderChannelTabs). null = display:none */
export type ChannelTabsView = {
  channels: string[]
  /** kênh có class `active` (ban đầu = selectedChannel, đổi khi click) */
  active: string
  vehicle: Loose
  files: PlaybackFile[]
  streamType: string
}

export type PlaybackState = {
  /** bindEvents() đã chạy (listener #pb-search-btn chỉ có sau init) */
  initialized: boolean
  /** loadVehicleDropdown() đã được gọi -> bật query danh sách xe */
  vehicleDropdownEnabled: boolean
  /** #pb-begin-time / #pb-end-time (input datetime-local ẩn) */
  beginTime: string
  endTime: string
  /** giá trị #pb-vehicle-select ('' hoặc chỉ số trong vehiclesCache) */
  vehicleValue: string
  vehiclesCache: Loose[]
  currentDevice: string | null
  currentVehicleName: string
  currentVehicleObj: Loose
  /** _recdFiles: cache file video để seek */
  recdFiles: PlaybackFile[]
  lastSearchRange: { beginFmt: string; endFmt: string }
  /** #pb-search-btn có class `loading` + "Đang tìm..." */
  searching: boolean
  playerPlate: string
  playerTime: string
  player: PlayerView
  channelTabs: ChannelTabsView | null
  fileList: FileListView
  /** #pb-filelist-count */
  fileListCount: string
  /** #pb-filelist-card style.display ('none' trong index.html và onSearch) */
  fileListVisible: boolean
  /** #pb-track-card style.display */
  trackCardVisible: boolean
  /** setTrackStatus: #pb-track-status, #pb-track-status-map, class active của #pb-track-status-header */
  trackStatus: { text: string; active: boolean }
  /** switchRightTab: tab phải đang active. index.html không có .pb-right-tab nên chỉ là điểm mở rộng (Task 13) */
  rightTab: string | null
  /** toggleRightPanel: .pb-main-layout.pb-right-collapsed */
  rightCollapsed: boolean
}

const INITIAL: PlaybackState = {
  initialized: false,
  vehicleDropdownEnabled: false,
  beginTime: '',
  endTime: '',
  vehicleValue: '',
  vehiclesCache: [],
  currentDevice: null,
  currentVehicleName: '',
  currentVehicleObj: null,
  recdFiles: [],
  lastSearchRange: { beginFmt: '', endFmt: '' },
  searching: false,
  playerPlate: '--',
  playerTime: '--',
  player: { kind: 'initial' },
  channelTabs: null,
  fileList: { kind: 'initial' },
  fileListCount: '0 file',
  fileListVisible: false,
  trackCardVisible: true,
  trackStatus: { text: 'Chưa có dữ liệu', active: false },
  rightTab: null,
  rightCollapsed: false,
}

export const usePlaybackStore = create<PlaybackState>(() => ({ ...INITIAL }))

/** Chỉ dùng trong test. */
export function resetPlaybackStore(): void {
  usePlaybackStore.setState({ ...INITIAL })
}
