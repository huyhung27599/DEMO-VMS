import { create } from 'zustand'
import type { StatusBadge } from './lib'

// Trạng thái hiển thị của dashboard. Bản gốc ghi thẳng vào DOM (setKpi, setProgress,
// renderVehicleTable, renderAlarmFeed, updateLastUpdated, class 'spinning'); bản mới ghi vào store.

export type KpiValue = string | number

export type VehicleRow = { plate: string; badge: StatusBadge }
export type AlarmFeedItem = { sev: 'critical' | 'warning' | 'info'; title: string; time: string }

export type DashboardState = {
  kpi: { total: KpiValue; online: KpiValue; offline: KpiValue; moving: KpiValue; alarms: KpiValue; mileage: KpiValue }
  onlinePct: KpiValue
  offlinePct: KpiValue
  bars: { online: number; offline: number; moving: number; mileage: number }
  /** null = hàng "Đang tải dữ liệu..." ban đầu */
  tableRows: VehicleRow[] | null
  tableCount: string
  searchText: string
  alarmItems: AlarmFeedItem[]
  lastUpdated: string
  refreshing: boolean
}

export const initialDashboardState: DashboardState = {
  kpi: { total: '--', online: '--', offline: '--', moving: '--', alarms: '--', mileage: '--' },
  onlinePct: '--',
  offlinePct: '--',
  bars: { online: 0, offline: 0, moving: 0, mileage: 0 },
  tableRows: null,
  tableCount: '0 phương tiện',
  searchText: '',
  alarmItems: [],
  lastUpdated: 'Đang tải dữ liệu...',
  refreshing: false,
}

export const useDashboardStore = create<DashboardState>()(() => initialDashboardState)

export function resetDashboardStore(): void {
  useDashboardStore.setState(initialDashboardState, true)
}
