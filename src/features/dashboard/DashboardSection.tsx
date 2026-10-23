import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { ContentSection } from '../../shared/ui/Section'
import { AlertTypeBars } from './components/AlertTypeBars'
import { KpiCard } from './components/KpiCard'
import { LatestAlertsTable } from './components/LatestAlertsTable'
import { TopAlertVehicles } from './components/TopAlertVehicles'
import './dashboard.css'
import { initDashboard } from './init'
import { PERIOD_OPTIONS, type DashboardPeriod } from './mockData'
import { dashboardRefreshQueryOptions, realtimeAlarmsQueryOptions } from './queries'
import { useDashboardStore } from './store'

function formatAlarmsDelta(delta: number): string {
  if (delta === 0) return 'Bằng hôm qua'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} so với hôm qua`
}

export function DashboardSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('dashboard')
  useQuery({ ...dashboardRefreshQueryOptions(), enabled })
  useQuery({ ...realtimeAlarmsQueryOptions(), enabled })

  const kpi = useDashboardStore((s) => s.kpi)
  const lastUpdated = useDashboardStore((s) => s.lastUpdated)
  const period = useDashboardStore((s) => s.period)

  useEffect(() => {
    initDashboard()
  }, [])

  return (
    <ContentSection id="dashboard" hidden={hidden} className="bg-[#f8fafc]">
      {/* Header khớp mockup: tiêu đề đen, subtitle xám, chỉ dropdown Hôm nay */}
      <header className="mb-6 flex items-start justify-between gap-4 max-[640px]:flex-col">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Trung tâm điều khiển</h2>
          <p id="dashboard-last-updated" className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">
            {lastUpdated}
          </p>
        </div>
        <label className="sr-only" htmlFor="dashboard-period">
          Khoảng thời gian
        </label>
        <select
          id="dashboard-period"
          value={period}
          onChange={(e) => useDashboardStore.setState({ period: e.target.value as DashboardPeriod })}
          className="cursor-pointer rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm font-medium text-[#334155] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48]"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </header>

      <div className="mb-5 grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[560px]:grid-cols-1">
        <KpiCard
          id="kpi-total-vehicles"
          variant="navy"
          icon="fa-bus"
          label="Tổng phương tiện"
          valueId="kpi-val-total"
          value={kpi.totalVehicles}
          sub={
            <>
              <span id="kpi-val-online" className="font-semibold">
                {kpi.onlineVehicles}
              </span>{' '}
              đang trực tuyến
            </>
          }
        />
        <KpiCard
          id="kpi-alarms-today"
          variant="red"
          icon="fa-triangle-exclamation"
          label="Cảnh báo hôm nay"
          valueId="kpi-val-alarms"
          value={kpi.alarmsToday}
          sub={<span id="kpi-alarms-delta">{formatAlarmsDelta(kpi.alarmsDelta)}</span>}
          pulse
        />
        <KpiCard
          id="kpi-active-drivers"
          variant="amber"
          icon="fa-users"
          label="Tài xế hoạt động"
          valueId="kpi-val-active-drivers"
          value={kpi.activeDrivers}
          sub={
            <>
              trên tổng{' '}
              <span id="kpi-val-total-drivers" className="font-semibold">
                {kpi.totalDrivers}
              </span>{' '}
              tài xế
            </>
          }
        />
        <KpiCard
          id="kpi-devices-online"
          variant="slate"
          icon="fa-sim-card"
          label="Thiết bị online"
          valueId="kpi-val-devices"
          value={
            <>
              {kpi.devicesOnline}
              <span className="text-[1.35rem] font-semibold opacity-60">/{kpi.devicesTotal}</span>
            </>
          }
          sub={
            <>
              <span id="kpi-val-devices-lost" className="font-semibold">
                {kpi.devicesLost}
              </span>{' '}
              mất tín hiệu
            </>
          }
        />
      </div>

      <div className="mb-5 grid grid-cols-[1.45fr_1fr] gap-4 max-[960px]:grid-cols-1">
        <AlertTypeBars />
        <TopAlertVehicles />
      </div>

      <LatestAlertsTable />
    </ContentSection>
  )
}
