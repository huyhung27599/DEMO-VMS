/** Mock trạng thái thiết bị / địa chỉ khi chưa có API telemetry trên liveview. */

export type DeviceStatusItem = {
  id: string
  label: string
  value: string
  tone: 'ok' | 'warn' | 'bad'
  icon: string
}

export const DEMO_DEVICE_STATUS: DeviceStatusItem[] = [
  { id: 'gps', label: 'GPS', value: '12 vệ tinh', tone: 'ok', icon: 'fa-location-crosshairs' },
  { id: 'signal', label: 'Tín hiệu', value: '5G · -68 dBm', tone: 'ok', icon: 'fa-signal' },
  { id: 'server', label: 'Máy chủ', value: 'Đã kết nối', tone: 'ok', icon: 'fa-server' },
  { id: 'storage', label: 'Bộ nhớ', value: '31% (24 ngày)', tone: 'warn', icon: 'fa-hard-drive' },
  { id: 'driver', label: 'Đăng nhập tài xế', value: 'Đã xác thực', tone: 'ok', icon: 'fa-id-card' },
]

export const DEMO_GPS_ADDRESS = 'QL1A, Bình Chánh, TP.HCM'

export const CAMERA_SLOT_LABELS = ['Camera tài xế', 'Khoang khách', 'Camera cửa', 'Phía trước'] as const
