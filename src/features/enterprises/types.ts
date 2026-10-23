export type UnitType = 'enterprise' | 'branch' | 'department'
export type UnitStatus = 'active' | 'inactive'

export type Unit = {
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
