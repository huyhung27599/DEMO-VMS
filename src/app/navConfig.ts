import type { AppRoute } from './useActiveSection'

export type NavItem = {
  target: AppRoute
  /** Font Awesome icon classes, e.g. "fa-regular fa-map" */
  icon: string
  text: string
}

export type NavGroup = {
  id: string
  label: string
  items: ReadonlyArray<NavItem>
}

/**
 * Sidebar IA khớp mock Gtel DASHCAM VMS.
 * Real pages: dashboard, liveview, playback, map, statistics→Báo cáo, driver, vehicle, settings.
 */
export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'overview',
    label: 'Tổng quan',
    items: [
      { target: 'dashboard', icon: 'fa-solid fa-table-cells-large', text: 'Trung tâm điều khiển' },
      { target: 'liveview', icon: 'fa-solid fa-video', text: 'Giám sát trực tuyến' },
      { target: 'playback', icon: 'fa-solid fa-circle-play', text: 'Phát lại video' },
      { target: 'map', icon: 'fa-solid fa-map', text: 'Bản đồ trực tuyến' },
    ],
  },
  {
    id: 'operations',
    label: 'Vận hành',
    items: [
      { target: 'statistics', icon: 'fa-solid fa-chart-column', text: 'Báo cáo' },
      { target: 'driver', icon: 'fa-solid fa-user', text: 'Quản lý tài xế' },
      { target: 'vehicle', icon: 'fa-solid fa-van-shuttle', text: 'Quản lý phương tiện' },
    ],
  },
  {
    id: 'admin',
    label: 'Quản trị',
    items: [
      { target: 'devices', icon: 'fa-solid fa-sim-card', text: 'Quản lý thiết bị' },
      { target: 'enterprises', icon: 'fa-solid fa-building', text: 'Quản lý doanh nghiệp' },
      { target: 'users', icon: 'fa-solid fa-user-plus', text: 'Quản lý người dùng' },
      { target: 'roles', icon: 'fa-solid fa-shield-halved', text: 'Quản lý phân quyền' },
      { target: 'settings', icon: 'fa-solid fa-gear', text: 'Cài đặt hệ thống' },
    ],
  },
]

export type PlaceholderMeta = { title: string; description: string }

export const PLACEHOLDER_PAGES: Readonly<Partial<Record<AppRoute, PlaceholderMeta>>> = {
  devices: {
    title: 'Quản lý thiết bị',
    description: 'Danh sách Box AI và Camera, trạng thái, firmware (SRS 3.16).',
  },
  enterprises: {
    title: 'Quản lý doanh nghiệp',
    description: 'Quản lý doanh nghiệp / tenant trên hệ thống VMS đa tenant.',
  },
  users: {
    title: 'Quản lý người dùng',
    description: 'Quản lý tài khoản người dùng VMS (SRS 3.19).',
  },
  roles: {
    title: 'Quản lý phân quyền',
    description: 'Quản lý vai trò và ma trận quyền (SRS 3.19).',
  },
  // Giữ stub cũ để deep-link không 404; không hiện trên sidebar mới
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
  audit: {
    title: 'Nhật ký Audit',
    description: 'Lịch sử thao tác trên hệ thống VMS (SRS 3.20).',
  },
}

export const STUB_ROUTES = [
  'devices',
  'enterprises',
  'users',
  'roles',
  'static-images',
  'ai-events',
  'reports-trips',
  'reports-speed',
  'reports-driving-time',
  'reports-stops',
  'reports-summary',
  'reports-ai-behavior',
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
