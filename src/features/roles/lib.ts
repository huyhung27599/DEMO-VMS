import {
  emptyMatrix,
  FEATURES,
  PERM_ACTIONS,
  ROLE_KIND_LABEL,
  ROLE_SCOPE_LABEL,
  type FeatureId,
  type Role,
  type PermAction,
  type PermissionMatrix,
  type RoleKind,
  type RoleScope,
} from './types'

export const PAGE_SIZE = 10

export type RoleFormValues = {
  name: string
  scope: RoleScope
  description: string
  permissions: PermissionMatrix
  companyId: string
}

export const EMPTY_ROLE_FORM: RoleFormValues = {
  name: '',
  scope: 'enterprise',
  description: '',
  permissions: emptyMatrix(),
  companyId: '',
}

export function scopeLabel(scope: RoleScope): string {
  return ROLE_SCOPE_LABEL[scope]
}

export function kindLabel(kind: RoleKind): string {
  return ROLE_KIND_LABEL[kind]
}

export function kindBadgeClass(kind: RoleKind): string {
  return kind === 'system'
    ? 'bg-[#1e293b] text-white ring-[#1e293b]'
    : 'bg-[#e0f2fe] text-[#0369a1] ring-[#bae6fd]'
}

export function cloneMatrix(matrix: PermissionMatrix): PermissionMatrix {
  const next = emptyMatrix()
  for (const f of FEATURES) {
    for (const a of PERM_ACTIONS) next[f.id][a.id] = matrix[f.id][a.id]
  }
  return next
}

export function countChecked(matrix: PermissionMatrix): number {
  let n = 0
  for (const f of FEATURES) {
    for (const a of PERM_ACTIONS) if (matrix[f.id][a.id]) n += 1
  }
  return n
}

export function setAllPermissions(matrix: PermissionMatrix, on: boolean): PermissionMatrix {
  const next = cloneMatrix(matrix)
  for (const f of FEATURES) {
    for (const a of PERM_ACTIONS) next[f.id][a.id] = on
  }
  return next
}

export function togglePermission(
  matrix: PermissionMatrix,
  featureId: FeatureId,
  action: PermAction,
): PermissionMatrix {
  const next = cloneMatrix(matrix)
  next[featureId][action] = !next[featureId][action]
  return next
}

export function filterRoles(roles: Role[], search: string): Role[] {
  const q = search.trim().toLowerCase()
  if (!q) return roles
  return roles.filter((r) => r.name.toLowerCase().includes(q))
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

export function canDeleteRole(role: Role): boolean {
  return role.kind === 'custom' && role.userCount === 0
}

export function canEditRole(role: Role): boolean {
  return role.kind === 'custom'
}

export function validateRoleForm(
  values: RoleFormValues,
  roles: Role[],
  opts: { editId?: string },
): string | null {
  const name = values.name.trim()
  if (!name) return 'Vui lòng nhập tên vai trò'
  if (name.length < 2 || name.length > 100) return 'Tên vai trò phải từ 2–100 ký tự'
  const clash = roles.some(
    (r) =>
      r.id !== opts.editId &&
      r.companyId === values.companyId &&
      r.name.trim().toLowerCase() === name.toLowerCase(),
  )
  if (clash) return 'Tên vai trò đã tồn tại'
  if (!values.companyId) return 'Vui lòng chọn doanh nghiệp'
  if (countChecked(values.permissions) < 1) return 'Vai trò phải có ít nhất một quyền'
  return null
}

/**
 * Chức năng UI → privilege id 808gps (doc permissionExplain: 4 quản lý nội bộ, 31 công ty, 32 vai trò,
 * 33 người dùng, 35 thiết bị, 36 xe, 613 bản đồ, 621/627 video, 6/631/623/641 phát lại, 2/21.. báo cáo).
 * shortcut: 1 chức năng = 1 nhóm privilege, 5 cột quyền không tách được trên 808gps
 */
export const FEATURE_PRIVILEGES: Record<FeatureId, number[]> = {
  dashboard: [14, 162],
  liveview: [613, 621, 627],
  playback: [6, 631, 623, 641],
  reports: [2, 21, 22, 24, 29, 211, 213],
  vehicles: [4, 36],
  devices: [4, 35],
  users: [4, 33],
  enterprises: [4, 31],
  roles: [4, 32],
}

/** Ô nào của chức năng được tick → lấy cả nhóm privilege của chức năng đó. */
export function matrixToPrivileges(matrix: PermissionMatrix): string {
  const ids = new Set<number>()
  for (const f of FEATURES) {
    if (PERM_ACTIONS.some((a) => matrix[f.id][a.id])) FEATURE_PRIVILEGES[f.id].forEach((id) => ids.add(id))
  }
  return [...ids].sort((a, b) => a - b).join(',')
}

/** Có ít nhất 1 privilege riêng của chức năng (không tính id 4 dùng chung) → bật cả 5 quyền. */
export function privilegesToMatrix(privilege: unknown): PermissionMatrix {
  const have = new Set(
    String(privilege ?? '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter(Number.isFinite),
  )
  const matrix = emptyMatrix()
  for (const f of FEATURES) {
    const on = FEATURE_PRIVILEGES[f.id].some((id) => id !== 4 && have.has(id))
    for (const a of PERM_ACTIONS) matrix[f.id][a.id] = on
  }
  return matrix
}

type Row = Record<string, unknown>

/** findUserRole.role[] + số người dùng theo findUserAccount.infos[].rid ("1,2"). */
export function toRoles(roles: Row[], users: Row[]): Role[] {
  const userCount: Record<string, number> = {}
  users.forEach((u) =>
    String(u.rid ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((id) => (userCount[id] = (userCount[id] || 0) + 1)),
  )
  return roles.map((r) => {
    const company = (r.company ?? {}) as Row
    const id = String(r.id)
    return {
      id,
      name: String(r.name ?? ''),
      description: '',
      userCount: userCount[id] || 0,
      scope: 'enterprise',
      kind: 'custom',
      permissions: privilegesToMatrix(r.privilege),
      companyId: String(company.id ?? ''),
      companyName: String(company.name ?? ''),
    }
  })
}
