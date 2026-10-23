export type UserStatus = 'active' | 'inactive' | 'locked' | 'pending'

export type User = {
  id: string
  fullName: string
  username: string
  email: string
  phone?: string
  enterpriseId: string
  enterpriseName: string
  roleIds: string[]
  status: UserStatus
  lastLoginAt: string | null
}

export type RoleChip = 'super' | 'admin' | 'monitor' | 'ops' | 'viewer'

/** Vai trò 808gps (findUserRole) cho chip / dropdown. */
export type Role = { id: string; name: string; chip: RoleChip }

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Đang hoạt động',
  inactive: 'Vô hiệu hóa',
  locked: 'Bị khóa',
  pending: 'Chờ kích hoạt',
}
