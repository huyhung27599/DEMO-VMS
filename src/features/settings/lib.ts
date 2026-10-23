import {
  ALERT_LEVEL_LABEL,
  type AlertLevel,
  type SystemLog,
} from './mockData'

export const LOG_PAGE_SIZE = 5

export function alertLevelBadgeClass(level: AlertLevel): string {
  switch (level) {
    case 'high':
      return 'bg-[#fde8eb] text-[#c92038] ring-[#f5c2c9]'
    case 'medium':
      return 'bg-[#fef3c7] text-[#b45309] ring-[#fde68a]'
    case 'low':
      return 'bg-[#f1f5f9] text-[#64748b] ring-[#e2e8f0]'
  }
}

export function alertLevelLabel(level: AlertLevel): string {
  return ALERT_LEVEL_LABEL[level]
}

export function filterLogs(
  logs: SystemLog[],
  filters: { search: string; action: string; date: string },
): SystemLog[] {
  const q = filters.search.trim().toLowerCase()
  return logs.filter((log) => {
    if (filters.action === 'login' && !log.action.toLowerCase().includes('đăng nhập')) return false
    if (filters.action === 'edit' && !log.action.toLowerCase().includes('sửa')) return false
    if (filters.action === 'delete' && !log.action.toLowerCase().includes('xóa')) return false
    if (filters.action === 'system' && log.actor !== 'Hệ thống') return false
    if (filters.date) {
      // filters.date is yyyy-mm-dd from input[type=date]; mock times are DD/MM
      const [y, m, d] = filters.date.split('-')
      if (y && m && d) {
        const token = `${d}/${m}`
        if (!log.time.startsWith(token)) return false
      }
    }
    if (!q) return true
    return (
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.detail.toLowerCase().includes(q)
    )
  })
}

export function paginateLogs<T>(items: T[], page: number, pageSize = LOG_PAGE_SIZE) {
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
