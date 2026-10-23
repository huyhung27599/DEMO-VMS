/** Demo UI khi API chưa trả tài xế / trạng thái / tốc độ / km / cảnh báo. */

export type VehicleStatus = 'online' | 'offline' | 'alert'

export type DemoVehicleMeta = {
  driver: string | null
  status: VehicleStatus
  speed: number
  todayKm: number
  alertCount: number
  firmware?: string
}

export type DemoAlert = {
  time: string
  type: string
  driver: string
  level: 'high' | 'medium' | 'low'
}

export const DEMO_VEHICLE_ALERTS: DemoAlert[] = [
  { time: '08/06 08:12', type: 'Mệt mỏi', driver: 'Long Nguyễn', level: 'high' },
  { time: '07/06 17:40', type: 'Dùng điện thoại', driver: 'Long Nguyễn', level: 'medium' },
  { time: '07/06 09:05', type: 'Quá tốc độ', driver: 'Long Nguyễn', level: 'medium' },
  { time: '05/06 14:22', type: 'Mất tập trung', driver: 'Long Nguyễn', level: 'low' },
]

export const DEMO_DRIVERS = [
  { id: 'd1', name: 'Long Nguyễn' },
  { id: 'd2', name: 'Nguyễn Tuấn Nam' },
  { id: 'd3', name: 'Võ Minh Tuấn' },
] as const

const STATUS_CYCLE: VehicleStatus[] = ['online', 'offline', 'alert', 'online', 'offline']
const DRIVERS = ['Long Nguyễn', 'Nguyễn Tuấn Nam', null, 'Võ Minh Tuấn', null] as const

function hashPlate(plate: string): number {
  let h = 0
  for (let i = 0; i < plate.length; i++) h = (h * 31 + plate.charCodeAt(i)) >>> 0
  return h
}

/** Meta demo ổn định theo biển số (không đụng API). */
export function getDemoVehicleMeta(plate: string): DemoVehicleMeta {
  const h = hashPlate(plate || 'x')
  const status = STATUS_CYCLE[h % STATUS_CYCLE.length]
  const driver = DRIVERS[h % DRIVERS.length]
  const speed = status === 'offline' ? 0 : 28 + (h % 50)
  const todayKm = status === 'offline' ? 0 : 40 + (h % 160)
  const alertCount = status === 'alert' ? 3 + (h % 5) : status === 'online' && h % 3 === 0 ? 2 : 0
  return {
    driver,
    status,
    speed,
    todayKm,
    alertCount,
    firmware: 'v2.4.2 · GPS tốt · 5G',
  }
}

export const STATUS_LABEL: Record<VehicleStatus, string> = {
  online: 'Trực tuyến',
  offline: 'Offline',
  alert: 'Cảnh báo',
}

export const PAGE_SIZE = 10
