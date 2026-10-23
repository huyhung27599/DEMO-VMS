/**
 * Mock chỉ cho phần dashboard chưa có API thật:
 * - KPI thiết bị (admin Devices vẫn mock)
 * - Delta cảnh báo so với hôm qua (chưa có query theo ngày lịch sử trên dashboard)
 * - Tên tài xế fallback khi mapping API trống
 */
import { MOCK_DEVICES } from '../devices/mockData'

export const MOCK_YESTERDAY_ALARM_COUNT = 4

export const MOCK_PLATE_DRIVERS: Readonly<Record<string, string>> = {
  '43C-11882': 'Nguyễn Quang Vương',
  '51F-23457': 'Nguyễn Tuấn Nam',
  '30M-81775': 'Long Nguyễn',
  '51F-39201': 'Trần Minh Hải',
  '29A-44512': 'Phạm Văn Đức',
}

export type DeviceKpiMock = {
  online: number
  total: number
  lost: number
}

export function getMockDeviceKpis(): DeviceKpiMock {
  const total = MOCK_DEVICES.length
  const online = MOCK_DEVICES.filter((d) => d.serverConnected === true).length
  return { online, total, lost: Math.max(0, total - online) }
}

export const ALERT_BAR_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'] as const

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
] as const

export type DashboardPeriod = (typeof PERIOD_OPTIONS)[number]['value']

/** Demo khớp mockup khi API cảnh báo hôm nay trả rỗng (không ghi đè khi đã có data thật). */
export const DEMO_ALARM_TYPE_BARS = [
  { name: 'Mệt mỏi', count: 142, color: ALERT_BAR_COLORS[0] },
  { name: 'Hút thuốc', count: 87, color: ALERT_BAR_COLORS[1] },
  { name: 'Dùng điện thoại', count: 54, color: ALERT_BAR_COLORS[2] },
  { name: 'Mất tập trung', count: 28, color: ALERT_BAR_COLORS[3] },
  { name: 'Quá tốc độ', count: 21, color: ALERT_BAR_COLORS[4] },
] as const

export const DEMO_TOP_VEHICLES = [
  { rank: 1, plate: '43C-11882', driver: 'Nguyễn Quang Vương', count: 5 },
  { rank: 2, plate: '51F-23457', driver: 'Nguyễn Tuấn Nam', count: 2 },
  { rank: 3, plate: '30M-81775', driver: 'Long Nguyễn', count: 0 },
] as const

export const DEMO_LATEST_ALERTS = [
  {
    id: 'demo-1',
    time: '08:41',
    plate: '43C-11882',
    driver: 'Nguyễn Quang Vương',
    type: 'Quá tốc độ',
    level: 'high' as const,
  },
  {
    id: 'demo-2',
    time: '08:12',
    plate: '30M-81775',
    driver: 'Long Nguyễn',
    type: 'Mệt mỏi',
    level: 'high' as const,
  },
  {
    id: 'demo-3',
    time: '07:55',
    plate: '51F-23457',
    driver: 'Nguyễn Tuấn Nam',
    type: 'Dùng điện thoại',
    level: 'medium' as const,
  },
] as const
