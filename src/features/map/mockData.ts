/** Nhãn DN / nhóm — UI lọc khi chưa có API phân nhóm trên map. */
export const MAP_COMPANY_OPTIONS = [
  { value: '', label: 'Tất cả DN' },
  { value: 'geic', label: 'GEIC' },
  { value: 'gtel', label: 'Gtel' },
] as const

export const MAP_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'online', label: 'Trực tuyến' },
  { value: 'alert', label: 'Cảnh báo' },
  { value: 'offline', label: 'Offline' },
] as const
