import { ROLES, STATUS_LABEL, type MockUser, type Persona, type RoleChip, type UserStatus } from './mockData'

export const PAGE_SIZE = 10

export type UserFilters = {
  search: string
  roleId: string
  status: '' | UserStatus
  enterpriseId: string
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase()
  return parts[parts.length - 1]![0]!.toUpperCase()
}

export function roleChipClass(chip: RoleChip): string {
  switch (chip) {
    case 'super':
      return 'bg-[#fde8eb] text-[#c92038] ring-[#f5c2c9]'
    case 'admin':
      return 'bg-[#1e293b] text-white ring-[#1e293b]'
    case 'monitor':
      return 'bg-[#e0f2fe] text-[#0369a1] ring-[#bae6fd]'
    case 'ops':
      return 'bg-[#fef3c7] text-[#b45309] ring-[#fde68a]'
    case 'viewer':
      return 'bg-[#f1f5f9] text-[#64748b] ring-[#e2e8f0]'
  }
}

export function rolesOf(roleIds: string[]) {
  return roleIds.map((id) => ROLES.find((r) => r.id === id)).filter(Boolean) as (typeof ROLES)[number][]
}

export function statusDotClass(status: UserStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500'
    case 'inactive':
      return 'bg-slate-400'
    case 'locked':
      return 'bg-amber-500'
    case 'pending':
      return 'bg-orange-400'
  }
}

export function filterUsers(
  users: MockUser[],
  filters: UserFilters,
  persona: Persona,
  lockedEnterpriseId: string,
): MockUser[] {
  const q = filters.search.trim().toLowerCase()
  return users.filter((u) => {
    if (persona === 'enterprise-admin' && u.enterpriseId !== lockedEnterpriseId) return false
    if (persona === 'enterprise-admin' && u.roleIds.includes('role-super')) return false
    if (filters.enterpriseId && u.enterpriseId !== filters.enterpriseId) return false
    if (filters.roleId && !u.roleIds.includes(filters.roleId)) return false
    if (filters.status && u.status !== filters.status) return false
    if (!q) return true
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
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

export function statusLabel(status: UserStatus): string {
  return STATUS_LABEL[status]
}

export type UserFormValues = {
  fullName: string
  username: string
  email: string
  phone: string
  enterpriseId: string
  roleIds: string[]
}

export const EMPTY_USER_FORM: UserFormValues = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  enterpriseId: '',
  roleIds: [],
}

export function validateUserForm(values: UserFormValues, opts: { usernameEditable: boolean }): string | null {
  const name = values.fullName.trim()
  if (!name) return 'Vui lòng nhập họ tên'
  if (name.length < 2 || name.length > 100) return 'Họ tên phải từ 2–100 ký tự'
  if (opts.usernameEditable) {
    const user = values.username.trim()
    if (!user) return 'Vui lòng nhập tên đăng nhập'
    if (!/^[a-zA-Z0-9._-]{4,50}$/.test(user)) return 'Tên đăng nhập 4–50 ký tự (chữ, số, . _ -)'
  }
  const email = values.email.trim()
  if (!email) return 'Vui lòng nhập email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không đúng định dạng'
  if (!values.enterpriseId) return 'Vui lòng chọn doanh nghiệp'
  if (values.roleIds.length < 1) return 'Vui lòng chọn ít nhất một vai trò'
  return null
}
