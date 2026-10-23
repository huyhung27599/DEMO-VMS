export type RoleScope = 'system' | 'enterprise'
export type RoleKind = 'system' | 'custom'
export type PermAction = 'view' | 'create' | 'update' | 'delete' | 'export'

export type FeatureId =
  | 'dashboard'
  | 'liveview'
  | 'playback'
  | 'reports'
  | 'vehicles'
  | 'devices'
  | 'users'
  | 'enterprises'
  | 'roles'

export type PermissionMatrix = Record<FeatureId, Record<PermAction, boolean>>

export type Role = {
  id: string
  name: string
  description: string
  userCount: number
  scope: RoleScope
  kind: RoleKind
  permissions: PermissionMatrix
  /** Doanh nghiệp sở hữu vai trò (findUserRole.company / mergeUserRole.cid) */
  companyId: string
  companyName: string
}

export const ROLE_SCOPE_LABEL: Record<RoleScope, string> = {
  system: 'Toàn hệ thống',
  enterprise: 'Theo doanh nghiệp',
}

export const ROLE_KIND_LABEL: Record<RoleKind, string> = {
  system: 'Hệ thống',
  custom: 'Tùy chỉnh',
}

export const PERM_ACTIONS: ReadonlyArray<{ id: PermAction; label: string }> = [
  { id: 'view', label: 'Xem' },
  { id: 'create', label: 'Thêm' },
  { id: 'update', label: 'Sửa' },
  { id: 'delete', label: 'Xóa' },
  { id: 'export', label: 'Xuất' },
]

/** Matches add-role mock matrix rows (UI demo). */
export const FEATURES: ReadonlyArray<{ id: FeatureId; label: string }> = [
  { id: 'dashboard', label: 'Trung tâm điều khiển' },
  { id: 'liveview', label: 'Giám sát trực tuyến' },
  { id: 'playback', label: 'Phát lại video' },
  { id: 'reports', label: 'Báo cáo' },
  { id: 'vehicles', label: 'Quản lý phương tiện' },
  { id: 'devices', label: 'Quản lý thiết bị' },
  { id: 'users', label: 'Quản lý người dùng' },
  { id: 'enterprises', label: 'Quản lý doanh nghiệp' },
  { id: 'roles', label: 'Phân quyền' },
]

export function emptyMatrix(): PermissionMatrix {
  const matrix = {} as PermissionMatrix
  for (const f of FEATURES) {
    matrix[f.id] = { view: false, create: false, update: false, delete: false, export: false }
  }
  return matrix
}

export function allTrueMatrix(): PermissionMatrix {
  const matrix = emptyMatrix()
  for (const f of FEATURES) {
    for (const a of PERM_ACTIONS) matrix[f.id][a.id] = true
  }
  return matrix
}
