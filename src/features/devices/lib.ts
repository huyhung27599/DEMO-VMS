import type { GpsQuality, Device } from './types'

export const PAGE_SIZE = 10

export type DeviceFilters = {
  search: string
  enterpriseId: string
}

export type DeviceFormValues = {
  serial: string
  sim: string
  enterpriseId: string
  vehicleId: string
}

export const EMPTY_DEVICE_FORM: DeviceFormValues = {
  serial: '',
  sim: '',
  enterpriseId: '',
  vehicleId: '',
}

export function gpsLabel(gps: GpsQuality | null): string {
  if (gps === 'good') return 'Tốt'
  if (gps === 'weak') return 'Yếu'
  return '—'
}

export function gpsTextClass(gps: GpsQuality | null): string {
  if (gps === 'good') return 'font-semibold text-emerald-600'
  if (gps === 'weak') return 'font-semibold text-orange-500'
  return 'text-text-muted'
}

export function storageBarClass(percent: number): string {
  if (percent >= 85) return 'bg-danger'
  if (percent >= 70) return 'bg-orange-400'
  return 'bg-emerald-500'
}

export function filterDevices(devices: Device[], filters: DeviceFilters): Device[] {
  const q = filters.search.trim().toLowerCase()
  return devices.filter((d) => {
    if (filters.enterpriseId && d.enterpriseId !== filters.enterpriseId) return false
    if (!q) return true
    return (
      d.serial.toLowerCase().includes(q) ||
      (d.vehiclePlate?.toLowerCase().includes(q) ?? false)
    )
  })
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): {
  rows: T[]
  totalPages: number
  page: number
  from: number
  to: number
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const rows = items.slice(start, start + pageSize)
  return {
    rows,
    totalPages,
    page: safePage,
    from: items.length === 0 ? 0 : start + 1,
    to: start + rows.length,
  }
}

export function validateDeviceForm(
  values: DeviceFormValues,
  devices: Device[],
  opts: { mode: 'create' | 'edit'; editId?: string },
): string | null {
  const serial = values.serial.trim()
  if (!serial) return 'Vui lòng nhập ID thiết bị'
  if (!/^[A-Za-z0-9]{4,30}$/.test(serial)) return 'ID thiết bị gồm 4–30 chữ hoặc số'
  if (
    devices.some(
      (d) => d.serial === serial && (opts.mode === 'create' || d.id !== opts.editId),
    )
  ) {
    return 'ID thiết bị đã tồn tại'
  }
  if (!values.enterpriseId) return 'Vui lòng chọn doanh nghiệp'
  // 808gps không có API liệt kê thiết bị chưa lắp → bắt buộc gắn xe để thiết bị còn hiện trong danh sách
  if (!values.vehicleId) return 'Vui lòng chọn phương tiện lắp đặt'
  if (values.sim.trim().length > 30) return 'SIM tối đa 30 ký tự'
  return null
}

type Row = Record<string, unknown>

const NET_LABEL: Record<string, string> = { '0': '3G', '1': 'WiFi', '2': 'Có dây', '3': '4G', '4': '5G' }
const isOn = (x: unknown) => x === 1 || x === '1'

/**
 * Thiết bị = queryUserVehicle.vehicles[].dl[] (808gps không có API liệt kê thiết bị),
 * trạng thái từ getDeviceStatus.status[] (id = devIdno), bộ nhớ từ getLoadDeviceInfo.devstaus[].
 */
export function toDevices(
  vehicles: Row[],
  statusRows: Row[],
  loadByDev: Record<string, Row>,
  companyNames: Record<string, string> = {},
): Device[] {
  const statusBy: Record<string, Row> = {}
  statusRows.forEach((r) => {
    if (r.id !== undefined) statusBy[String(r.id)] = r
  })
  return vehicles.flatMap((v) => {
    const dl = Array.isArray(v.dl) ? (v.dl as Row[]) : []
    const enterpriseId = String(v.pid ?? '')
    const plate = String(v.nm || v.vehiIdno || '') || null
    const cameras = String(v.chnName || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    return dl
      .filter((d) => d && d.id !== undefined)
      .map((d): Device => {
        const id = String(d.id)
        const st = statusBy[id]
        const load = loadByDev[id]
        const sats = st && st.sn !== undefined && Number.isFinite(Number(st.sn)) ? Number(st.sn) : null
        const all = Number(load?.AllVolume)
        const left = Number(load?.LeftVolume)
        return {
          id,
          serial: id,
          sim: String(d.sim ?? ''),
          enterpriseId,
          enterpriseName: String(v.pnm || companyNames[enterpriseId] || ''),
          vehicleId: plate,
          vehiclePlate: plate,
          gps: sats === null ? null : sats >= 4 ? 'good' : 'weak',
          gpsSatellites: sats,
          network: st && st.net !== undefined ? NET_LABEL[String(st.net)] || null : null,
          signalDbm: null,
          serverConnected: st ? isOn(st.ol) : null,
          storagePercent: all > 0 && Number.isFinite(left) ? Math.round((1 - left / all) * 100) : null,
          storageDays: null,
          cameras,
          lastOnline: st?.gt ? String(st.gt) : null,
          installedAt: d.ist ? String(d.ist) : null,
          model: String(load?.DevType || load?.Version || '—'),
          history: [],
        }
      })
  })
}
