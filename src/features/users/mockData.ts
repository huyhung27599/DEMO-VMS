export type UserStatus = 'active' | 'inactive' | 'locked' | 'pending'
export type Persona = 'super-admin' | 'enterprise-admin'

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

export const ENTERPRISES = [
  { id: 'ent-geic', name: 'GEIC' },
  { id: 'ent-abc', name: 'Công ty ABC Vận tải' },
  { id: 'ent-xyz', name: 'XYZ Logistics' },
  { id: 'ent-delta', name: 'Delta Express' },
] as const

export const ROLES = [
  { id: 'role-super', name: 'Super Admin', superOnly: true },
  { id: 'role-ent-admin', name: 'Quản trị doanh nghiệp', superOnly: false },
  { id: 'role-ops', name: 'Nhân viên điều hành', superOnly: false },
  { id: 'role-monitor', name: 'Giám sát viên', superOnly: false },
  { id: 'role-viewer', name: 'Chỉ xem', superOnly: false },
] as const

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
    email: 'nvan@geic.vn',
    phone: '0901234567',
    enterpriseId: 'ent-geic',
    enterpriseName: 'GEIC',
    roleIds: ['role-super'],
    status: 'active',
    lastLoginAt: '2026-10-19 08:12',
  },
  {
    id: 'u2',
    fullName: 'Trần Thị Bình',
    username: 'ttbinh',
    email: 'binh@abc.vn',
    enterpriseId: 'ent-abc',
    enterpriseName: 'Công ty ABC Vận tải',
    roleIds: ['role-ent-admin'],
    status: 'active',
    lastLoginAt: '2026-10-18 16:40',
  },
  {
    id: 'u3',
    fullName: 'Lê Minh Cường',
    username: 'lmcuong',
    email: 'cuong@abc.vn',
    enterpriseId: 'ent-abc',
    enterpriseName: 'Công ty ABC Vận tải',
    roleIds: ['role-ops'],
    status: 'active',
    lastLoginAt: '2026-10-17 09:05',
  },
  {
    id: 'u4',
    fullName: 'Phạm Thu Dung',
    username: 'ptdung',
    email: 'dung@xyz.vn',
    enterpriseId: 'ent-xyz',
    enterpriseName: 'XYZ Logistics',
    roleIds: ['role-monitor'],
    status: 'locked',
    lastLoginAt: '2026-10-10 11:22',
  },
  {
    id: 'u5',
    fullName: 'Hoàng Đức Em',
    username: 'hdem',
    email: 'em@delta.vn',
    enterpriseId: 'ent-delta',
    enterpriseName: 'Delta Express',
    roleIds: ['role-viewer'],
    status: 'inactive',
    lastLoginAt: null,
  },
  {
    id: 'u6',
    fullName: 'Võ Thị Phương',
    username: 'vtphuong',
    email: 'phuong@abc.vn',
    enterpriseId: 'ent-abc',
    enterpriseName: 'Công ty ABC Vận tải',
    roleIds: ['role-ops', 'role-monitor'],
    status: 'pending',
    lastLoginAt: null,
  },
  {
    id: 'u7',
    fullName: 'Đặng Quốc Huy',
    username: 'dqhuy',
    email: 'huy@xyz.vn',
    enterpriseId: 'ent-xyz',
    enterpriseName: 'XYZ Logistics',
    roleIds: ['role-ent-admin'],
    status: 'active',
    lastLoginAt: '2026-10-20 07:55',
  },
  {
    id: 'u8',
    fullName: 'Bùi Thanh Lan',
    username: 'btlan',
    email: 'lan@delta.vn',
    enterpriseId: 'ent-delta',
    enterpriseName: 'Delta Express',
    roleIds: ['role-ops'],
    status: 'active',
    lastLoginAt: '2026-10-15 14:18',
  },
  {
    id: 'u9',
    fullName: 'Ngô Văn Khoa',
    username: 'nvkhoa',
    email: 'khoa@abc.vn',
    enterpriseId: 'ent-abc',
    enterpriseName: 'Công ty ABC Vận tải',
    roleIds: ['role-viewer'],
    status: 'inactive',
    lastLoginAt: '2026-09-01 10:00',
  },
  {
    id: 'u10',
    fullName: 'Đỗ Mỹ Linh',
    username: 'dmlinh',
    email: 'linh@xyz.vn',
    enterpriseId: 'ent-xyz',
    enterpriseName: 'XYZ Logistics',
    roleIds: ['role-monitor'],
    status: 'active',
    lastLoginAt: '2026-10-19 21:03',
  },
  {
    id: 'u11',
    fullName: 'Mai Anh Tuấn',
    username: 'matuan',
    email: 'tuan@delta.vn',
    enterpriseId: 'ent-delta',
    enterpriseName: 'Delta Express',
    roleIds: ['role-ops'],
    status: 'locked',
    lastLoginAt: '2026-10-12 08:30',
  },
  {
    id: 'u12',
    fullName: 'Lý Hải Nam',
    username: 'lhnam',
    email: 'nam@geic.vn',
    enterpriseId: 'ent-geic',
    enterpriseName: 'GEIC',
    roleIds: ['role-ops'],
    status: 'active',
    lastLoginAt: '2026-10-20 06:40',
  },
]

/** Demo enterprise admin is locked to ABC */
export const DEMO_ENTERPRISE_ID = 'ent-abc'
