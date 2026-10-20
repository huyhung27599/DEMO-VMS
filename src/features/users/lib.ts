import { ROLES, STATUS_LABEL, type MockUser, type Persona, type UserStatus } from './mockData'

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
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function roleNames(roleIds: string[]): string {
  return roleIds
    .map((id) => ROLES.find((r) => r.id === id)?.name ?? id)
    .join(', ')
}

export function statusBadgeClass(status: UserStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'inactive':
      return 'bg-slate-100 text-slate-600 ring-slate-200'
    case 'locked':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case 'pending':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
  }
}

export function filterUsers(users: MockUser[], filters: UserFilters, persona: Persona, lockedEnterpriseId: string): MockUser[] {
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

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): { rows: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return { rows: items.slice(start, start + pageSize), totalPages, page: safePage }
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
