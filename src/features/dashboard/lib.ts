// Hàm thuần chuyển từ frontend/js/dashboard.js:24-95 (+ các bảng tra trong renderAlarmFeed/updateAlarmDistChart).

const pad = (n: number): string => String(n).padStart(2, '0')

export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayDatetime(endOfDay = false): string {
  const date = today()
  return endOfDay ? `${date} 23:59:59` : `${date} 00:00:00`
}

export function normalizeId(v: unknown): string {
  return String(v || '').trim()
}

export function formatTime(isoOrTimestamp: unknown): string {
  try {
    const d =
      typeof isoOrTimestamp === 'number'
        ? new Date(isoOrTimestamp * 1000)
        : new Date(isoOrTimestamp as string)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return `${diff}s trước`
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`
    return `${d.getDate()}/${d.getMonth() + 1} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return '--'
  }
}

export function lastUpdatedText(now: Date = new Date()): string {
  return `Cập nhật lúc: ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export type StatusBadge = { kind: 'offline' | 'moving' | 'parked'; label: string }

// Bản gốc trả về chuỗi <span class="veh-status-badge veh-status-{kind}">{label}</span>
export function getStatusBadge(veh: Record<string, unknown> | null | undefined): StatusBadge {
  if (!veh) return { kind: 'offline', label: 'Ngoại tuyến' }

  const isOnline = veh.ol === 1 || veh.ol === '1' || veh.status === 1 || veh.status === '1'
  if (!isOnline) return { kind: 'offline', label: 'Ngoại tuyến' }

  const spdNum = Number(veh.speed)
  const isMoving = Number.isFinite(spdNum) && spdNum > 3
  if (isMoving) return { kind: 'moving', label: 'Di chuyển' }
  return { kind: 'parked', label: 'Đỗ xe' }
}

export const ALARM_TYPE_MAP: Record<number, string> = {
  2: 'Quá tốc độ',
  3: 'Phanh gấp',
  4: 'Tăng tốc mạnh',
  5: 'Rẽ gấp',
  12: 'Mất kết nối GPS',
  9: 'Tắt máy đột ngột',
  11: 'Rung động',
  600: 'ADAS - Lệch làn',
  601: 'ADAS - Theo dõi khoảng cách',
  605: 'DSM - Buồn ngủ',
  607: 'DSM - Mất tập trung',
  618: 'DSM - Lái xe mệt mỏi',
  620: 'DSM - Nghe điện thoại',
  622: 'DSM - Hút thuốc',
  624: 'DSM - Mất tập trung (AI)',
  190: 'DSM - Ngáp',
  33: 'SOS khẩn cấp',
}

export const ALARM_NAME_MAP: Record<number, string> = {
  2: 'Quá tốc độ',
  3: 'Phanh gấp',
  4: 'Tăng tốc',
  605: 'Buồn ngủ',
  607: 'Mất tập trung',
  600: 'Lệch làn',
  618: 'Cảnh báo mệt mỏi',
  620: 'Nghe điện thoại',
  622: 'Hút thuốc',
  33: 'SOS',
  12: 'Mất GPS',
  9: 'Tắt máy',
}

export function getSeverity(armType: unknown): 'critical' | 'warning' | 'info' {
  const type = parseInt(String(armType))
  if ([33].includes(type)) return 'critical'
  if ([605, 607, 618, 620, 622, 624, 190].includes(type)) return 'warning'
  return 'info'
}
