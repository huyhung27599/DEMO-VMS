import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { onSectionShown } from '../../app/useActiveSection'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { dashboardCharts } from './chartsController'
import { AlarmFeed } from './components/AlarmFeed'
import { ChartCard } from './components/ChartCard'
import { KpiCard } from './components/KpiCard'
import { LiveVehiclesPanel } from './components/LiveVehiclesPanel'
import './dashboard.css'
import { initDashboard } from './init'
import { dashboardKeys, dashboardRefreshQueryOptions, realtimeAlarmsQueryOptions } from './queries'
import { useDashboardStore } from './store'

export function DashboardSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('dashboard')
  const queryClient = useQueryClient()
  // Hai setInterval của init(): 120_000 ms (refresh) và 60_000 ms (pollRealtimeAlarms)
  useQuery({ ...dashboardRefreshQueryOptions(), enabled })
  useQuery({ ...realtimeAlarmsQueryOptions(), enabled })

  const kpi = useDashboardStore((s) => s.kpi)
  const onlinePct = useDashboardStore((s) => s.onlinePct)
  const offlinePct = useDashboardStore((s) => s.offlinePct)
  const bars = useDashboardStore((s) => s.bars)
  const lastUpdated = useDashboardStore((s) => s.lastUpdated)
  const refreshing = useDashboardStore((s) => s.refreshing)

  const statusRef = useRef<HTMLDivElement>(null)
  const trendRef = useRef<HTMLDivElement>(null)
  const alarmRankRef = useRef<HTMLDivElement>(null)
  const mileageRef = useRef<HTMLDivElement>(null)
  const alarmDistRef = useRef<HTMLDivElement>(null)

  // initCharts() + resize khi quay lại section (nav click -> setTimeout 150 ms, đã nằm trong onSectionShown)
  useEffect(() => {
    initDashboard()
    dashboardCharts.initCharts({
      vehicleStatus: statusRef.current,
      onlineTrend: trendRef.current,
      alarmRank: alarmRankRef.current,
      mileageRank: mileageRef.current,
      alarmDist: alarmDistRef.current,
    })
    const unsubscribe = onSectionShown('dashboard', () => dashboardCharts.resize())
    return () => {
      unsubscribe()
      dashboardCharts.dispose()
    }
  }, [])

  return (
    <ContentSection id="dashboard" hidden={hidden}>
      <SectionHeader title="Trung tâm điều khiển" subtitle={<span id="dashboard-last-updated">{lastUpdated}</span>}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="dashboard-refresh-btn"
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
            onClick={() => void queryClient.refetchQueries({ queryKey: dashboardKeys.refresh })}
            className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-base p-0 text-text-muted transition-all duration-250 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'animate-[spin_0.8s_linear_infinite]' : ''}`}></i>
          </button>
        </div>
      </SectionHeader>

      {/* KPI Stat Cards Row */}
      <div className="mb-5 grid grid-cols-6 gap-4 max-[1400px]:grid-cols-3 max-[768px]:grid-cols-2">
        <KpiCard
          id="kpi-total-vehicles"
          color="blue"
          icon="fa-truck-front"
          label="Tổng phương tiện"
          valueId="kpi-val-total"
          value={kpi.total}
          sub="Thiết bị đã đăng ký"
          bar={{ width: 100, faded: true }}
        />
        <KpiCard
          id="kpi-online-vehicles"
          color="green"
          icon="fa-signal"
          label="Đang trực tuyến"
          valueId="kpi-val-online"
          value={kpi.online}
          sub={
            <>
              <span id="kpi-online-pct">{onlinePct}</span>% tổng đội xe
            </>
          }
          bar={{ id: 'kpi-online-bar', width: bars.online }}
        />
        <KpiCard
          id="kpi-offline-vehicles"
          color="gray"
          icon="fa-wifi-slash"
          label="Ngoại tuyến"
          valueId="kpi-val-offline"
          value={kpi.offline}
          sub={
            <>
              <span id="kpi-offline-pct">{offlinePct}</span>% tổng đội xe
            </>
          }
          bar={{ id: 'kpi-offline-bar', width: bars.offline, faded: true }}
        />
        <KpiCard
          id="kpi-moving-vehicles"
          color="teal"
          icon="fa-route"
          label="Đang di chuyển"
          valueId="kpi-val-moving"
          value={kpi.moving}
          sub="Xe đang có tín hiệu GPS"
          bar={{ id: 'kpi-moving-bar', width: bars.moving }}
        />
        <KpiCard
          id="kpi-alarms-today"
          color="red"
          icon="fa-triangle-exclamation"
          label="Báo động hôm nay"
          valueId="kpi-val-alarms"
          value={kpi.alarms}
          sub="Sự kiện chưa xử lý"
          pulse
        />
        <KpiCard
          id="kpi-total-mileage"
          color="purple"
          icon="fa-road"
          label="Quãng đường hôm nay"
          valueId="kpi-val-mileage"
          value={kpi.mileage}
          sub="Kilomet (KM)"
          bar={{ id: 'kpi-mileage-bar', width: bars.mileage }}
        />
      </div>

      {/* Main Dashboard Grid: Charts + Live Table */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-5 max-[1100px]:grid-cols-1">
        {/* LEFT COLUMN: Charts */}
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex gap-5 max-[1100px]:flex-wrap">
            <ChartCard
              size="sm"
              icon="fa-chart-pie"
              iconColor="#3b82f6"
              title="Trạng thái phương tiện"
              badge={{ id: 'chart-vehicle-status-badge', text: 'Thời gian thực', color: 'blue' }}
              bodyId="chart-vehicle-status"
              bodyRef={statusRef}
            />
            <ChartCard
              size="lg"
              icon="fa-wave-square"
              iconColor="#10b981"
              title="Xu hướng trực tuyến (hôm nay)"
              bodyId="chart-online-trend"
              bodyRef={trendRef}
            />
          </div>
          <div className="flex gap-5 max-[1100px]:flex-wrap">
            <ChartCard
              size="md"
              icon="fa-ranking-star"
              iconColor="#ef4444"
              title="Top xe báo động"
              badge={{ id: 'alarm-rank-period', text: 'Hôm nay', color: 'red' }}
              bodyId="chart-alarm-rank"
              bodyRef={alarmRankRef}
            />
            <ChartCard
              size="md"
              icon="fa-road"
              iconColor="#8b5cf6"
              title="Quãng đường (KM)"
              badge={{ id: 'mileage-rank-period', text: 'Hôm nay', color: 'purple' }}
              bodyId="chart-mileage-rank"
              bodyRef={mileageRef}
            />
            <ChartCard
              size="sm"
              icon="fa-circle-nodes"
              iconColor="#f59e0b"
              title="Phân loại báo động"
              bodyId="chart-alarm-distribution"
              bodyRef={alarmDistRef}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Live Vehicle Table + Activity Feed */}
        <div className="flex min-w-0 flex-col gap-5 max-[1100px]:grid max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
          <LiveVehiclesPanel />
          <AlarmFeed />
        </div>
      </div>
    </ContentSection>
  )
}
