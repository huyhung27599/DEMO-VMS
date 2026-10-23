import {
  UNIT_STATUS_LABEL,
  UNIT_TYPE_LABEL,
  type Unit,
  type UnitStatus,
  type UnitType,
} from './types'

export const PAGE_SIZE = 20

export type UnitFilters = {
  search: string
  type: '' | UnitType
  status: '' | UnitStatus
}

export type UnitFormValues = {
  name: string
  code: string
  type: UnitType
  parentId: string
  address: string
  representative: string
  phone: string
  email: string
  /** Tài khoản chủ của đơn vị — mergeCompany bắt buộc khi tạo mới */
  account: string
  password: string
}

export const EMPTY_UNIT_FORM: UnitFormValues = {
  name: '',
  code: '',
  type: 'enterprise',
  parentId: '',
  address: '',
  representative: '',
  phone: '',
  email: '',
  account: '',
  password: '',
}

export function typeBadgeClass(type: UnitType): string {
  switch (type) {
    case 'enterprise':
      return 'bg-[#1e293b] text-white ring-[#1e293b]'
    case 'branch':
      return 'bg-[#e0f2fe] text-[#0369a1] ring-[#bae6fd]'
    case 'department':
      return 'bg-[#f1f5f9] text-[#64748b] ring-[#e2e8f0]'
  }
}

export function statusDotClass(status: UnitStatus): string {
  return status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
}

export function statusLabel(status: UnitStatus): string {
  return UNIT_STATUS_LABEL[status]
}

export function typeLabel(type: UnitType): string {
  return UNIT_TYPE_LABEL[type]
}

export function childrenOf(units: Unit[], parentId: string | null): Unit[] {
  return units.filter((u) => u.parentId === parentId)
}

export function hasChildren(units: Unit[], id: string): boolean {
  return units.some((u) => u.parentId === id)
}

/** Collect id + all descendant ids (for cycle checks and delete guards). */
export function descendantIds(units: Unit[], rootId: string): Set<string> {
  const byParent = new Map<string | null, Unit[]>()
  for (const u of units) {
    const list = byParent.get(u.parentId) ?? []
    list.push(u)
    byParent.set(u.parentId, list)
  }
  const out = new Set<string>()
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    for (const child of byParent.get(id) ?? []) {
      if (out.has(child.id)) continue
      out.add(child.id)
      stack.push(child.id)
    }
  }
  return out
}

export function canDeleteUnit(units: Unit[], unit: Unit): boolean {
  if (hasChildren(units, unit.id)) return false
  if (unit.userCount > 0 || unit.deviceCount > 0 || unit.vehicleCount > 0) return false
  return true
}

export function filterUnits(units: Unit[], filters: UnitFilters): Unit[] {
  const q = filters.search.trim().toLowerCase()
  return units.filter((u) => {
    if (filters.type && u.type !== filters.type) return false
    if (filters.status && u.status !== filters.status) return false
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q)
  })
}

/**
 * Flatten tree for display: keep hierarchy order among filtered nodes.
 * A node is shown if it matches filters OR has a matching descendant (so tree context stays).
 */
export function buildVisibleTree(
  units: Unit[],
  filters: UnitFilters,
  expanded: Set<string>,
): Array<{ unit: Unit; depth: number; hasKids: boolean }> {
  const matched = new Set(filterUnits(units, filters).map((u) => u.id))
  const keep = new Set<string>()
  for (const id of matched) {
    keep.add(id)
    let cur = units.find((u) => u.id === id)
    while (cur?.parentId) {
      keep.add(cur.parentId)
      cur = units.find((u) => u.id === cur!.parentId)
    }
  }

  const rows: Array<{ unit: Unit; depth: number; hasKids: boolean }> = []

  const walk = (parentId: string | null, depth: number) => {
    const kids = childrenOf(units, parentId).filter((u) => keep.has(u.id))
    for (const unit of kids) {
      const kidsInKeep = childrenOf(units, unit.id).some((c) => keep.has(c.id))
      rows.push({ unit, depth, hasKids: kidsInKeep })
      if (kidsInKeep && expanded.has(unit.id)) walk(unit.id, depth + 1)
    }
  }

  walk(null, 0)
  return rows
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

/** Active units eligible as parent (exclude self + descendants when editing). */
export function parentOptions(
  units: Unit[],
  opts?: { excludeId?: string },
): Unit[] {
  const blocked = opts?.excludeId ? descendantIds(units, opts.excludeId) : new Set<string>()
  if (opts?.excludeId) blocked.add(opts.excludeId)
  return units.filter((u) => u.status === 'active' && !blocked.has(u.id))
}

export function validateUnitForm(
  values: UnitFormValues,
  units: Unit[],
  opts: { mode: 'create' | 'edit'; editId?: string },
): string | null {
  const name = values.name.trim()
  if (!name) return 'Vui lòng nhập tên đơn vị'
  if (name.length < 2 || name.length > 100) return 'Tên đơn vị phải từ 2–100 ký tự'

  // Mã đơn vị không ghi được qua mergeCompany → không bắt buộc; tài khoản chủ thì bắt buộc khi tạo
  if (opts.mode === 'create') {
    const account = values.account.trim()
    if (!account) return 'Vui lòng nhập tài khoản quản trị đơn vị'
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(account)) return 'Tài khoản chỉ gồm chữ, số và (. _ -), 3–50 ký tự'
    if (values.password && values.password.length < 6) return 'Mật khẩu tối thiểu 6 ký tự'
  }

  const parentId = values.parentId || null
  const siblingClash = units.some(
    (u) =>
      u.parentId === parentId &&
      u.name.trim().toLowerCase() === name.toLowerCase() &&
      u.id !== opts.editId,
  )
  if (siblingClash) return 'Tên đơn vị đã tồn tại trong cùng đơn vị cha'

  if (opts.editId && parentId) {
    const blocked = descendantIds(units, opts.editId)
    blocked.add(opts.editId)
    if (blocked.has(parentId)) return 'Không thể chọn đơn vị con làm đơn vị cha'
  }

  if (parentId) {
    const parent = units.find((u) => u.id === parentId)
    if (!parent) return 'Đơn vị cha không hợp lệ'
    if (parent.status !== 'active') return 'Chỉ được chọn đơn vị cha đang hoạt động'
  }

  if (values.address.trim().length > 255) return 'Địa chỉ tối đa 255 ký tự'
  if (values.representative.trim().length > 255) return 'Người đại diện tối đa 255 ký tự'
  if (values.phone.trim().length > 20) return 'Số điện thoại tối đa 20 ký tự'
  const email = values.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không đúng định dạng'

  return null
}

type Row = Record<string, unknown>

/**
 * findCompany.infos[] → Unit. level: 1 = công ty, 12 = phòng ban (doc 808gps).
 * Đếm người dùng theo findUserAccount.infos[].pid, xe/thiết bị theo queryUserVehicle.vehicles[].pid.
 * 808gps không có trạng thái khóa đơn vị → luôn 'active'.
 */
export function toUnits(companies: Row[], users: Row[], vehicles: Row[]): Unit[] {
  const ids = new Set(companies.map((c) => String(c.id)))
  const count = (rows: Row[], n: (r: Row) => number = () => 1) => {
    const m: Record<string, number> = {}
    rows.forEach((r) => {
      const k = String(r.pid ?? '')
      m[k] = (m[k] || 0) + n(r)
    })
    return m
  }
  const usersBy = count(users)
  const vehiclesBy = count(vehicles)
  const devicesBy = count(vehicles, (v) => (Array.isArray(v.dl) ? v.dl.length : v.dl ? 1 : 0))
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

  return companies.map((c) => {
    const id = String(c.id)
    const parentId = ids.has(String(c.parentId)) ? String(c.parentId) : null
    return {
      id,
      name: String(c.name ?? ''),
      code: String(c.code ?? ''),
      type: Number(c.level) === 12 ? 'department' : parentId ? 'branch' : 'enterprise',
      parentId,
      status: 'active',
      userCount: usersBy[id] || 0,
      deviceCount: devicesBy[id] || 0,
      vehicleCount: vehiclesBy[id] || 0,
      address: str(c.address),
      representative: str(c.linkMan),
      phone: str(c.linkPhone),
      email: str(c.linkEmail),
    }
  })
}
