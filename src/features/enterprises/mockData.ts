export type UnitType = 'enterprise' | 'branch' | 'department'
export type UnitStatus = 'active' | 'inactive'

export type MockUnit = {
  id: string
  name: string
  code: string
  type: UnitType
  parentId: string | null
  status: UnitStatus
  userCount: number
  deviceCount: number
  vehicleCount: number
  address?: string
  representative?: string
  phone?: string
  email?: string
}

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  enterprise: 'Doanh nghiệp',
  branch: 'Chi nhánh',
  department: 'Phòng ban',
}

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  active: 'Đang hoạt động',
  inactive: 'Vô hiệu hóa',
}

/** Hierarchical org tree matching mock — UI demo only. */
export const MOCK_UNITS: MockUnit[] = [
  {
    id: 'u-pd',
    name: 'VT Phương Đông',
    code: 'PD',
    type: 'enterprise',
    parentId: null,
    status: 'active',
    userCount: 12,
    deviceCount: 45,
    vehicleCount: 30,
    address: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    representative: 'Nguyễn Văn Đông',
    phone: '024 1234 5678',
    email: 'lienhe@phuongdong.vn',
  },
  {
    id: 'u-pd-hn',
    name: 'CN Hà Nội',
    code: 'PD-HN',
    type: 'branch',
    parentId: 'u-pd',
    status: 'active',
    userCount: 5,
    deviceCount: 18,
    vehicleCount: 12,
    address: 'Hà Nội',
    representative: 'Trần Thị Hà',
    phone: '024 2222 3333',
    email: 'hanoi@phuongdong.vn',
  },
  {
    id: 'u-pd-hn-dh',
    name: 'Phòng Điều hành',
    code: 'PD-HN-DH',
    type: 'department',
    parentId: 'u-pd-hn',
    status: 'active',
    userCount: 3,
    deviceCount: 0,
    vehicleCount: 0,
    representative: 'Lê Minh',
    phone: '0912 000 111',
    email: 'dieuhanh@phuongdong.vn',
  },
  {
    id: 'u-pd-dn',
    name: 'CN Đà Nẵng',
    code: 'PD-DN',
    type: 'branch',
    parentId: 'u-pd',
    status: 'inactive',
    userCount: 2,
    deviceCount: 8,
    vehicleCount: 5,
    address: 'Đà Nẵng',
    representative: 'Phạm Văn Đà',
    phone: '0236 111 222',
    email: 'danang@phuongdong.vn',
  },
  {
    id: 'u-tc',
    name: 'HTX Thành Công',
    code: 'TC',
    type: 'enterprise',
    parentId: null,
    status: 'active',
    userCount: 8,
    deviceCount: 22,
    vehicleCount: 15,
    address: 'Bình Dương',
    representative: 'Hoàng Thành',
    phone: '0274 555 666',
    email: 'lienhe@thanhcong.vn',
  },
  {
    id: 'u-hd',
    name: 'Cty Vận tải Hoàng Dũng',
    code: 'HD',
    type: 'enterprise',
    parentId: null,
    status: 'active',
    userCount: 15,
    deviceCount: 60,
    vehicleCount: 40,
    address: 'TP. Hồ Chí Minh',
    representative: 'Hoàng Dũng',
    phone: '028 777 8888',
    email: 'lienhe@hoangdung.vn',
  },
]
