export type UserStatus = 'active' | 'inactive' | 'locked' | 'pending'

export type MockUser = {
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

/** Dropdown options on user form only — not a Doanh nghiệp management page. */
export const ENTERPRISES = [
  { id: 'ent-geic', name: 'GEIC (Hệ thống)' },
  { id: 'ent-pd', name: 'VT Phương Đông' },
  { id: 'ent-pt', name: 'VT Phương Trang' },
  { id: 'ent-hn', name: 'Xe khách Hà Nội' },
] as const

export const ROLES = [
  { id: 'role-super', name: 'Super Admin', chip: 'super' },
  { id: 'role-ent-admin', name: 'Quản trị doanh nghiệp', chip: 'admin' },
  { id: 'role-monitor', name: 'Giám sát viên', chip: 'monitor' },
  { id: 'role-ops', name: 'Vận hành', chip: 'ops' },
  { id: 'role-viewer', name: 'Chỉ xem', chip: 'viewer' },
] as const

export type RoleChip = (typeof ROLES)[number]['chip']

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Đang hoạt động',
  inactive: 'Vô hiệu hóa',
  locked: 'Bị khóa',
  pending: 'Chờ kích hoạt',
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'u1',
    fullName: 'Nguyễn Văn An',
    username: 'nvan',
    email: 'an.nv@geic.vn',
    phone: '0901234567',
    enterpriseId: 'ent-geic',
    enterpriseName: 'GEIC (Hệ thống)',
    roleIds: ['role-super'],
    status: 'active',
    lastLoginAt: '08/08/2026 08:41',
  },
  {
    id: 'u2',
    fullName: 'Trần Thị Bình',
    username: 'ttbinh',
    email: 'binh.tt@phuongtrang.vn',
    enterpriseId: 'ent-pt',
    enterpriseName: 'VT Phương Trang',
    roleIds: ['role-ent-admin'],
    status: 'active',
    lastLoginAt: '07/08/2026 17:20',
  },
  {
    id: 'u3',
    fullName: 'Lê Hoàng Cường',
    username: 'cuong.lh',
    email: 'cuong.lh@phuongdong.vn',
    phone: '0912 345 678',
    enterpriseId: 'ent-pd',
    enterpriseName: 'VT Phương Đông',
    roleIds: ['role-monitor', 'role-ops'],
    status: 'active',
    lastLoginAt: '08/08/2026 09:15',
  },
  {
    id: 'u4',
    fullName: 'Phạm Thu Dung',
    username: 'ptdung',
    email: 'dung.pt@hanoi.vn',
    enterpriseId: 'ent-hn',
    enterpriseName: 'Xe khách Hà Nội',
    roleIds: ['role-monitor'],
    status: 'active',
    lastLoginAt: '06/08/2026 11:02',
  },
  {
    id: 'u5',
    fullName: 'Hoàng Minh Đức',
    username: 'hmduc',
    email: 'duc.hm@phuongdong.vn',
    enterpriseId: 'ent-pd',
    enterpriseName: 'VT Phương Đông',
    roleIds: ['role-viewer'],
    status: 'inactive',
    lastLoginAt: '01/07/2026 10:00',
  },
  {
    id: 'u6',
    fullName: 'Võ Thị Phương',
    username: 'vtphuong',
    email: 'phuong.vt@phuongtrang.vn',
    enterpriseId: 'ent-pt',
    enterpriseName: 'VT Phương Trang',
    roleIds: ['role-ops'],
    status: 'pending',
    lastLoginAt: null,
  },
]
