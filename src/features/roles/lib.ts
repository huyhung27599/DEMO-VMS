import {
  emptyMatrix,
  FEATURES,
  PERM_ACTIONS,
  ROLE_KIND_LABEL,
  ROLE_SCOPE_LABEL,
  type FeatureId,
  type MockRole,
  type PermAction,
  type PermissionMatrix,
  type RoleKind,
  type RoleScope,
} from './mockData'

export const PAGE_SIZE = 10

export type RoleFormValues = {
  name: string
  scope: RoleScope
  description: string
  permissions: PermissionMatrix
}

export const EMPTY_ROLE_FORM: RoleFormValues = {
  name: '',
  scope: 'enterprise',
  description: '',
  permissions: emptyMatrix(),
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

export function filterRoles(roles: MockRole[], search: string): MockRole[] {
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

export function canDeleteRole(role: MockRole): boolean {
  return role.kind === 'custom' && role.userCount === 0
}

export function canEditRole(role: MockRole): boolean {
  return role.kind === 'custom'
}

export function validateRoleForm(
  values: RoleFormValues,
  roles: MockRole[],
  opts: { editId?: string },
): string | null {
  const name = values.name.trim()
  if (!name) return 'Vui lòng nhập tên vai trò'
  if (name.length < 2 || name.length > 100) return 'Tên vai trò phải từ 2–100 ký tự'
  const clash = roles.some(
    (r) =>
      r.id !== opts.editId &&
      r.scope === values.scope &&
      r.name.trim().toLowerCase() === name.toLowerCase(),
  )
  if (clash) return 'Tên vai trò đã tồn tại'
  if (values.description.trim().length > 255) return 'Mô tả tối đa 255 ký tự'
  if (countChecked(values.permissions) < 1) return 'Vai trò phải có ít nhất một quyền'
  return null
}
