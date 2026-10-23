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

export type MockRole = {
  id: string
  name: string
  description: string
  userCount: number
  scope: RoleScope
  kind: RoleKind
  permissions: PermissionMatrix
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

function matrixFrom(
  entries: Partial<Record<FeatureId, Partial<Record<PermAction, boolean>>>>,
): PermissionMatrix {
  const matrix = emptyMatrix()
  for (const [fid, actions] of Object.entries(entries) as Array<
    [FeatureId, Partial<Record<PermAction, boolean>>]
  >) {
    for (const [aid, on] of Object.entries(actions) as Array<[PermAction, boolean]>) {
      matrix[fid][aid] = on
    }
  }
  return matrix
}

export const MOCK_ROLES: MockRole[] = [
  {
    id: 'role-sys',
    name: 'Quản trị hệ thống',
    description: 'Toàn quyền trên toàn hệ thống',
    userCount: 1,
    scope: 'system',
    kind: 'system',
    permissions: allTrueMatrix(),
  },
  {
    id: 'role-ent-admin',
    name: 'Quản lý doanh nghiệp',
    description: 'Quản trị trong phạm vi doanh nghiệp',
    userCount: 3,
    scope: 'enterprise',
    kind: 'custom',
    permissions: matrixFrom({
      dashboard: { view: true, export: true },
      liveview: { view: true },
      playback: { view: true },
      reports: { view: true, export: true },
      vehicles: { view: true, create: true, update: true, delete: true, export: true },
      devices: { view: true, create: true, update: true, delete: true, export: true },
      users: { view: true, create: true, update: true, delete: true, export: true },
      enterprises: { view: true, create: true, update: true, export: true },
      roles: { view: true, create: true, update: true },
    }),
  },
  {
    id: 'role-monitor',
    name: 'Giám sát viên',
    description: 'Theo dõi trực tuyến, xem báo cáo',
    userCount: 6,
    scope: 'enterprise',
    kind: 'custom',
    permissions: matrixFrom({
      dashboard: { view: true },
      liveview: { view: true },
      playback: { view: true },
      reports: { view: true, export: true },
    }),
  },
  {
    id: 'role-ops',
    name: 'Vận hành',
    description: 'Quản lý phương tiện, thiết bị',
    userCount: 4,
    scope: 'enterprise',
    kind: 'custom',
    permissions: matrixFrom({
      dashboard: { view: true },
      liveview: { view: true },
      playback: { view: true },
      vehicles: { view: true, create: true, update: true, export: true },
      devices: { view: true, create: true, update: true, export: true },
    }),
  },
  {
    id: 'role-viewer',
    name: 'Chỉ xem',
    description: 'Chỉ xem dữ liệu, không chỉnh sửa',
    userCount: 2,
    scope: 'enterprise',
    kind: 'custom',
    permissions: matrixFrom({
      dashboard: { view: true },
      liveview: { view: true },
      playback: { view: true },
      reports: { view: true },
    }),
  },
]
