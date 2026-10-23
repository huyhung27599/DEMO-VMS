import { isStatusOnline, statusUid, type DeviceStatus } from './lib'

export type MapRowStatus = 'online' | 'alert' | 'offline'

export function resolveMapRowStatus(s: DeviceStatus): MapRowStatus {
  if (s.alarm || s.alert || s.alarmType || s.armType) return 'alert'
  return isStatusOnline(s) ? 'online' : 'offline'
}

export function resolveMapSpeed(s: DeviceStatus): string {
  if (typeof s.speed === 'number' && Number.isFinite(s.speed)) return `${Math.round(s.speed)} km/h`
  if (typeof s.sp === 'number' && Number.isFinite(s.sp)) return `${Math.round(s.sp / 10)} km/h`
  return '—'
}

export function resolveMapPlate(s: DeviceStatus): string {
  return String(s.vehicleName || statusUid(s) || '—')
}

export function resolveMapDriver(s: DeviceStatus): string {
  return s.dn ? String(s.dn) : '—'
}

export function countByStatus(statuses: DeviceStatus[]): { online: number; alert: number; offline: number } {
  let online = 0
  let alert = 0
  let offline = 0
  for (const s of statuses) {
    const st = resolveMapRowStatus(s)
    if (st === 'online') online += 1
    else if (st === 'alert') alert += 1
    else offline += 1
  }
  return { online, alert, offline }
}
