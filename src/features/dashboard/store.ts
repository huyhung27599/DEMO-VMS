import { create } from 'zustand'
import type { DashboardPeriod } from './mockData'

export type KpiValue = string | number

export type AlertLevel = 'high' | 'medium' | 'low'

export type AlarmTypeBar = { name: string; count: number; color: string }

export type TopAlertVehicle = {
  rank: number
  plate: string
  driver: string
  count: number
}

export type LatestAlertRow = {
  id: string
  time: string
  plate: string
  driver: string
  type: string
  level: AlertLevel
}

export type DashboardKpi = {
  totalVehicles: KpiValue
  onlineVehicles: KpiValue
  alarmsToday: KpiValue
  /** so với hôm qua (mock delta khi chưa có API lịch sử) */
  alarmsDelta: number
  activeDrivers: KpiValue
  totalDrivers: KpiValue
  devicesOnline: KpiValue
  devicesTotal: KpiValue
  devicesLost: KpiValue
}

export type DashboardState = {
  kpi: DashboardKpi
  period: DashboardPeriod
  alarmTypeBars: AlarmTypeBar[]
  topVehicles: TopAlertVehicle[]
  latestAlerts: LatestAlertRow[]
  lastUpdated: string
  refreshing: boolean
}

export const initialDashboardState: DashboardState = {
  kpi: {
    totalVehicles: '--',
    onlineVehicles: '--',
    alarmsToday: '--',
    alarmsDelta: 0,
    activeDrivers: '--',
    totalDrivers: '--',
    devicesOnline: '--',
    devicesTotal: '--',
    devicesLost: '--',
  },
  period: 'today',
  alarmTypeBars: [],
  topVehicles: [],
  latestAlerts: [],
  lastUpdated: 'Đang tải dữ liệu...',
  refreshing: false,
}

export const useDashboardStore = create<DashboardState>()(() => initialDashboardState)

export function resetDashboardStore(): void {
  useDashboardStore.setState(initialDashboardState, true)
}
