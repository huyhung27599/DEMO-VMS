// Hàm thuần chuyển từ frontend/js/vehicle.js.

export type VehicleDevice = { id?: string; devIdno?: string }

/** Bản ghi xe từ API (FleetControl/808gps), sau khi chuẩn hóa ở loadVehicles. */
export type Vehicle = {
  vehiIdno?: string
  nm?: string
  plate?: string
  devIdno?: string
  dl?: VehicleDevice[]
  vehiType?: string | number
  vehiColor?: string
  companyId?: string
  companyName?: string
  pid?: string
  pnm?: string
  groupId?: string
  groupName?: string
  parentId?: string
  parentName?: string
  [key: string]: unknown
}

export type Company = { id: string; name: string }

// vehicle.js:340-348
export function extractDevId(v: Vehicle | null | undefined): string {
  if (!v) return '--'
  if (v.devIdno) return v.devIdno
  // v.dl (device list)
  if (Array.isArray(v.dl) && v.dl.length > 0) {
    return v.dl[0].id || v.dl[0].devIdno || '--'
  }
  return '--'
}

const TYPE_LABELS: Record<string, string> = { '1': 'Xe con', '2': 'Xe tải', '3': 'Xe khách', '4': 'Xe container' }
const TYPE_CLASSES: Record<string, string> = {
  '1': 'badge-car',
  '2': 'badge-truck',
  '3': 'badge-bus',
  '4': 'badge-container',
}

// vehicle.js:350-358
export function getVehicleTypeLabel(type: string | number | null | undefined): string {
  return (type != null && TYPE_LABELS[type]) || 'Chưa phân loại'
}

// vehicle.js:360-368
export function getVehicleTypeClass(type: string | number | null | undefined): string {
  return (type != null && TYPE_CLASSES[type]) || ''
}

// vehicle.js:127-134
export function normalizeVehicle(v: Vehicle): Vehicle {
  return {
    ...v,
    vehiIdno: v.vehiIdno || v.nm || '',
    plate: v.nm || v.vehiIdno || '',
    companyId: v.companyId || v.pid || '',
    companyName: v.companyName || v.pnm || '',
    devIdno: v.devIdno || extractDevId(v) || '',
  }
}

// vehicle.js:146-167 (username = AuthModule.getUsername(): dự phòng khi payload không có đơn vị)
export function deriveCompanies(vehicles: Vehicle[], username: string): Company[] {
  const uniqueCos: Record<string, string> = {}
  vehicles.forEach((v) => {
    const id = v.companyId || v.pid || v.groupId || v.parentId || ''
    const name = v.companyName || v.pnm || v.groupName || v.parentName || ''
    if (id && name) uniqueCos[id] = name
  })
  if (Object.keys(uniqueCos).length === 0 && username) uniqueCos[username] = username
  return Object.entries(uniqueCos).map(([id, name]) => ({ id, name }))
}

// vehicle.js:190-195
export function filterVehicles(vehicles: Vehicle[], rawTerm: string): Vehicle[] {
  const searchTerm = rawTerm.toLowerCase().trim()
  return vehicles.filter((v) => {
    const plate = (v.plate || v.nm || v.vehiIdno || '').toLowerCase()
    const devId = (v.devIdno || extractDevId(v) || '').toLowerCase()
    return plate.includes(searchTerm) || devId.includes(searchTerm)
  })
}

export function paginateVehicles<T>(
  items: T[],
  page: number,
  pageSize: number,
): { rows: T[]; totalPages: number; page: number; from: number; to: number } {
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

export type VehicleFormValues = {
  vehiIdno: string
  devIdno: string
  vehiType: string
  vehiColor: string
  companyId: string
}

// vehicle.js:270-271 — Object.fromEntries(new FormData(form)): <select> không có lựa chọn thì không có mặt.
// `companyUnmatched`: chế độ sửa, coId của xe không có trong <select> đơn vị -> `select.value = coId` không chọn gì
// (selectedIndex -1) nên FormData bỏ companyId. Người dùng đã chọn một đơn vị (giá trị khác '') thì vẫn gửi.
export function buildSavePayload(
  values: VehicleFormValues,
  opts: { companyUnmatched?: boolean } = {},
): Record<string, string> {
  const payload: Record<string, string> = { vehiIdno: values.vehiIdno, devIdno: values.devIdno }
  if (values.vehiType !== '') payload.vehiType = values.vehiType
  payload.vehiColor = values.vehiColor
  if (!(opts.companyUnmatched && values.companyId === '')) payload.companyId = values.companyId
  return payload
}

// openModal: form.reset() -> giá trị mặc định của form (<select> loại xe chọn mục đầu '1', đơn vị '')
export const EMPTY_VEHICLE_FORM: VehicleFormValues = {
  vehiIdno: '',
  devIdno: '',
  vehiType: '1',
  vehiColor: '',
  companyId: '',
}
