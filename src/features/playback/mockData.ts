/** Sự kiện trong ngày — mock khi chưa có API timeline sự kiện AI trên playback. */

export type DayEventTone = 'critical' | 'warn' | 'info'

export type DayEvent = {
  id: string
  title: string
  time: string
  tone: DayEventTone
}

export const DEMO_DAY_EVENTS: DayEvent[] = [
  { id: 'e1', title: 'Mệt mỏi', time: '09:12', tone: 'critical' },
  { id: 'e2', title: 'Quá tốc độ', time: '09:55', tone: 'warn' },
  { id: 'e3', title: 'Dùng điện thoại', time: '10:30', tone: 'warn' },
  { id: 'e4', title: 'Mất tập trung', time: '14:22', tone: 'info' },
  { id: 'e5', title: 'Phanh gấp', time: '16:48', tone: 'info' },
]

export const CAMERA_FILTER_OPTIONS = [
  { value: '0', label: 'Tất cả camera' },
  { value: '1', label: 'Camera lái xe' },
  { value: '2', label: 'Khoang khách' },
  { value: '3', label: 'Camera cửa' },
  { value: '4', label: 'Phía trước' },
] as const
