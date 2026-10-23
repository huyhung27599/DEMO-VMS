/** Demo bổ sung UI khi API chưa trả GPLX / biển số / lịch sử cảnh báo. */

export type DemoAlert = {
  time: string
  type: string
  vehicle: string
  level: 'high' | 'medium' | 'low'
}

export const DEMO_ALERTS: DemoAlert[] = [
  { time: '08/06 08:12', type: 'Mệt mỏi', vehicle: '30M-81775', level: 'high' },
  { time: '07/06 17:40', type: 'Dùng điện thoại', vehicle: '30M-81775', level: 'medium' },
  { time: '07/06 09:05', type: 'Quá tốc độ', vehicle: '30M-81775', level: 'medium' },
  { time: '05/06 14:22', type: 'Mất tập trung', vehicle: '30M-81775', level: 'low' },
]

export const DEMO_DRIVER_STATS = {
  trips: 142,
  alerts30d: 7,
  hoursMonth: 186,
}

export const LICENSE_CLASS_OPTIONS = ['B1', 'B2', 'C', 'D', 'E', 'FC'] as const

/** Dropdown doanh nghiệp (UI); lọc client-side khi driver có companyName. */
export const DRIVER_ENTERPRISES = [
  { id: 'ent-pd', name: 'VT Phương Đông' },
  { id: 'ent-hd', name: 'Cty Hoàng Dũng' },
  { id: 'ent-tc', name: 'HTX Thành Công' },
  { id: 'ent-geic', name: 'GEIC' },
] as const
