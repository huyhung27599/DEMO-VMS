import type { GpsQuality, MockDevice } from './mockData'

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

export function filterDevices(devices: MockDevice[], filters: DeviceFilters): MockDevice[] {
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
  devices: MockDevice[],
  opts: { mode: 'create' | 'edit'; editId?: string },
): string | null {
  const serial = values.serial.trim()
  if (!serial) return 'Vui lòng nhập ID thiết bị'
  if (!/^\d{8,20}$/.test(serial)) return 'ID thiết bị phải gồm 8–20 chữ số'
  if (
    devices.some(
      (d) => d.serial === serial && (opts.mode === 'create' || d.id !== opts.editId),
    )
  ) {
    return 'ID thiết bị đã tồn tại'
  }
  if (!values.enterpriseId) return 'Vui lòng chọn doanh nghiệp'
  if (values.sim.trim().length > 30) return 'SIM tối đa 30 ký tự'
  return null
}
