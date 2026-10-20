import type { AppRoute } from './useActiveSection'

export type NavItem = {
  target: AppRoute
  icon: string
  text: string
}

export type NavGroup = {
  id: string
  label: string
  items: ReadonlyArray<NavItem>
}

/** Primary sidebar IA — event-server & statistics omitted from nav. */
export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'overview',
    label: 'Tổng quan',
    items: [{ target: 'dashboard', icon: 'fa-table-columns', text: 'Trung tâm điều khiển' }],
  },
  {
    id: 'monitor',
    label: 'Giám sát',
    items: [
      { target: 'liveview', icon: 'fa-video', text: 'Giám sát trực tuyến' },
      { target: 'map', icon: 'fa-map-location-dot', text: 'Bản đồ trực tuyến' },
      { target: 'playback', icon: 'fa-circle-play', text: 'Phát lại video' },
      { target: 'static-images', icon: 'fa-image', text: 'Ảnh tĩnh' },
      { target: 'ai-events', icon: 'fa-clapperboard', text: 'Video sự kiện AI' },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    items: [
      { target: 'reports-trips', icon: 'fa-route', text: 'Báo cáo hành trình' },
      { target: 'reports-speed', icon: 'fa-gauge-high', text: 'Báo cáo tốc độ' },
      { target: 'reports-driving-time', icon: 'fa-clock', text: 'Thời gian lái liên tục' },
      { target: 'reports-stops', icon: 'fa-hand', text: 'Dừng, đỗ' },
      { target: 'reports-summary', icon: 'fa-file-lines', text: 'Báo cáo tổng hợp' },
      { target: 'reports-ai-behavior', icon: 'fa-brain', text: 'Hành vi AI' },
    ],
  },
  {
    id: 'manage',
    label: 'Quản lý',
    items: [
      { target: 'driver', icon: 'fa-id-card', text: 'Quản lý tài xế' },
      { target: 'vehicle', icon: 'fa-truck-front', text: 'Quản lý phương tiện' },
      { target: 'devices', icon: 'fa-server', text: 'Quản lý thiết bị' },
    ],
  },
  {
    id: 'settings',
    label: 'Cài đặt',
    items: [
      { target: 'settings', icon: 'fa-sliders', text: 'Ngưỡng cảnh báo' },
      { target: 'users', icon: 'fa-users', text: 'Người dùng' },
      { target: 'roles', icon: 'fa-user-shield', text: 'Phân quyền' },
      { target: 'audit', icon: 'fa-clipboard-list', text: 'Nhật ký Audit' },
    ],
  },
]

export type PlaceholderMeta = { title: string; description: string }

export const PLACEHOLDER_PAGES: Readonly<Partial<Record<AppRoute, PlaceholderMeta>>> = {
  'static-images': {
    title: 'Ảnh tĩnh',
    description: 'Hiển thị ảnh tĩnh truyền về từ thiết bị (SRS 3.4).',
  },
  'ai-events': {
    title: 'Video sự kiện AI',
    description: 'Xem ảnh và video ngắn quanh sự kiện DSM/ADAS (SRS 3.5).',
  },
  'reports-trips': {
    title: 'Báo cáo hành trình',
    description: 'Báo cáo hành trình xe chạy theo Phụ lục B QCVN06 (SRS 3.8).',
  },
  'reports-speed': {
    title: 'Báo cáo tốc độ',
    description: 'Báo cáo tốc độ vận hành theo Phụ lục B QCVN06 (SRS 3.9).',
  },
  'reports-driving-time': {
    title: 'Thời gian lái xe liên tục',
    description: 'Báo cáo thời gian lái xe liên tục theo Phụ lục B QCVN06 (SRS 3.10).',
  },
  'reports-stops': {
    title: 'Báo cáo dừng, đỗ',
    description: 'Báo cáo dừng, đỗ theo Phụ lục B QCVN06 (SRS 3.11).',
  },
  'reports-summary': {
    title: 'Báo cáo tổng hợp',
    description: 'Báo cáo tổng hợp theo Phụ lục B QCVN06 (SRS 3.12).',
  },
  'reports-ai-behavior': {
    title: 'Báo cáo hành vi AI',
    description: 'Báo cáo hành vi AI theo Phụ lục B QCVN06 (SRS 3.13).',
  },
  devices: {
    title: 'Quản lý thiết bị',
    description: 'Danh sách Box AI và Camera, trạng thái, firmware (SRS 3.16).',
  },
  users: {
    title: 'Người dùng',
    description: 'Quản lý tài khoản người dùng VMS (SRS 3.19).',
  },
  roles: {
    title: 'Phân quyền',
    description: 'Quản lý vai trò và ma trận quyền (SRS 3.19).',
  },
  audit: {
    title: 'Nhật ký Audit',
    description: 'Lịch sử thao tác trên hệ thống VMS (SRS 3.20).',
  },
}

export const STUB_ROUTES = [
  'static-images',
  'ai-events',
  'reports-trips',
  'reports-speed',
  'reports-driving-time',
  'reports-stops',
  'reports-summary',
  'reports-ai-behavior',
  'devices',
  'users',
  'roles',
  'audit',
] as const satisfies ReadonlyArray<AppRoute>

export type StubRoute = (typeof STUB_ROUTES)[number]

export function isStubRoute(route: string): route is StubRoute {
  return (STUB_ROUTES as readonly string[]).includes(route)
}

export function groupIdForRoute(route: AppRoute | 'login'): string | null {
  for (const g of NAV_GROUPS) {
    if (g.items.some((i) => i.target === route)) return g.id
  }
  return null
}
