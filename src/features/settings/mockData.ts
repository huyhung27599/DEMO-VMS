export type SettingsTab = 'general' | 'ai' | 'storage' | 'logs'

export type AlertLevel = 'high' | 'medium' | 'low'

export type AiAlertType = {
  id: string
  name: string
  level: AlertLevel
  speaker: boolean
  enabled: boolean
}

export type SystemLog = {
  id: string
  time: string
  actor: string
  action: string
  detail: string
}

export type GeneralSettings = {
  language: string
  datetimeFormat: string
  speedUnit: string
  signalLossMinutes: string
}

export type AiSettings = {
  sensitivity: string
  alertBeforeRecord: string
  alerts: AiAlertType[]
}

export type StorageSettings = {
  normalRetentionDays: string
  alertRetentionDays: string
  resolution: string
  autoDelete: string
}

export const SETTINGS_TABS: ReadonlyArray<{
  id: SettingsTab
  label: string
  icon: string
}> = [
  { id: 'general', label: 'Cấu hình chung', icon: 'fa-gear' },
  { id: 'ai', label: 'Cảnh báo AI', icon: 'fa-triangle-exclamation' },
  { id: 'storage', label: 'Lưu trữ video', icon: 'fa-hard-drive' },
  { id: 'logs', label: 'Nhật ký hệ thống', icon: 'fa-file-lines' },
]

export const DEFAULT_GENERAL: GeneralSettings = {
  language: 'vi',
  datetimeFormat: 'DD/MM/YYYY HH:mm',
  speedUnit: 'km/h',
  signalLossMinutes: '30',
}

export const DEFAULT_AI: AiSettings = {
  sensitivity: 'medium',
  alertBeforeRecord: '2',
  alerts: [
    { id: 'drowsy', name: 'Phát hiện mệt mỏi / ngủ gật', level: 'high', speaker: true, enabled: true },
    { id: 'smoke', name: 'Phát hiện hút thuốc', level: 'medium', speaker: true, enabled: true },
    { id: 'phone', name: 'Phát hiện dùng điện thoại', level: 'high', speaker: true, enabled: true },
    { id: 'distract', name: 'Phát hiện mất tập trung', level: 'medium', speaker: true, enabled: true },
    { id: 'seatbelt', name: 'Không thắt dây an toàn', level: 'low', speaker: false, enabled: false },
    { id: 'noface', name: 'Không nhận diện được tài xế', level: 'high', speaker: true, enabled: true },
  ],
}

export const DEFAULT_STORAGE: StorageSettings = {
  normalRetentionDays: '30',
  alertRetentionDays: '90',
  resolution: '1080p',
  autoDelete: 'on',
}

export const MOCK_SYSTEM_LOGS: SystemLog[] = [
  {
    id: 'l1',
    time: '08/06 09:43',
    actor: 'GEIC Admin',
    action: 'Đăng nhập hệ thống',
    detail: '—',
  },
  {
    id: 'l2',
    time: '08/06 08:30',
    actor: 'Quản lý DN',
    action: 'Sửa phương tiện 30M-81775',
    detail: 'Cập nhật tài xế',
  },
  {
    id: 'l3',
    time: '07/06 17:12',
    actor: 'GEIC Admin',
    action: 'Xóa tài xế',
    detail: 'MS 99887',
  },
  {
    id: 'l4',
    time: '07/06 09:05',
    actor: 'Hệ thống',
    action: 'Cập nhật firmware OTA',
    detail: '052040001185 → v2.4.2',
  },
  {
    id: 'l5',
    time: '06/06 22:00',
    actor: 'Hệ thống',
    action: 'Tự động xóa video cũ',
    detail: '142 file > 30 ngày',
  },
]

export const LOG_TOTAL_COUNT = 1248

export const ALERT_LEVEL_LABEL: Record<AlertLevel, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

export const LOG_ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'login', label: 'Đăng nhập hệ thống' },
  { value: 'edit', label: 'Sửa dữ liệu' },
  { value: 'delete', label: 'Xóa dữ liệu' },
  { value: 'system', label: 'Hệ thống' },
] as const
