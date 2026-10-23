export const ALERT_BAR_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'] as const

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
] as const

export type DashboardPeriod = (typeof PERIOD_OPTIONS)[number]['value']
