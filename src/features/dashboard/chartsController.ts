import * as echarts from 'echarts'
import { ALARM_NAME_MAP } from './lib'

// Port của dashboard.js:172-396. Option ECharts chép nguyên.

export type ChartElements = {
  vehicleStatus: HTMLElement | null
  alarmDist: HTMLElement | null
  alarmRank: HTMLElement | null
  mileageRank: HTMLElement | null
  onlineTrend: HTMLElement | null
}

type ChartKey = keyof ChartElements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

const NO_DATA_TITLE = {
  text: 'Chưa có dữ liệu',
  left: 'center',
  top: 'center',
  textStyle: { fontSize: 12, color: '#999' },
}

export class DashboardChartsController {
  private charts: Partial<Record<ChartKey, echarts.ECharts>> = {}
  private onlineTrendData: { time: string; value: number }[] = [] // _onlineTrendData
  private sidebar: Element | null = null
  private resizeAll = () => this.resize()

  initCharts(els: ChartElements): void {
    const c = this.charts
    // 1. Vehicle Status Pie
    if (els.vehicleStatus && !c.vehicleStatus) c.vehicleStatus = echarts.init(els.vehicleStatus)
    // 2. Alarm Distribution
    if (els.alarmDist && !c.alarmDist) c.alarmDist = echarts.init(els.alarmDist)
    // 3. Alarm Rank
    if (els.alarmRank && !c.alarmRank) c.alarmRank = echarts.init(els.alarmRank)
    // 4. Mileage Rank
    if (els.mileageRank && !c.mileageRank) c.mileageRank = echarts.init(els.mileageRank)

    // 5. Online Trend (placeholder)
    if (els.onlineTrend && !c.onlineTrend) {
      c.onlineTrend = echarts.init(els.onlineTrend)
      c.onlineTrend.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
          axisLabel: { fontSize: 9 },
        },
        yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { fontSize: 9 } },
        series: [
          {
            name: 'Trực tuyến',
            type: 'line',
            smooth: true,
            lineStyle: { width: 2, color: '#3b82f6' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(59,130,246,0.3)' },
                { offset: 1, color: 'rgba(59,130,246,0.02)' },
              ]),
            },
            data: this.onlineTrendData.map((d) => d.value),
          },
        ],
      })
    }

    // Resize handler (remove + add cùng một hàm -> không bị nhân đôi)
    window.removeEventListener('resize', this.resizeAll)
    window.addEventListener('resize', this.resizeAll, { passive: true })

    const sidebar = document.querySelector('.sidebar')
    if (this.sidebar) this.sidebar.removeEventListener('transitionend', this.resizeAll)
    this.sidebar = sidebar
    if (sidebar) {
      sidebar.removeEventListener('transitionend', this.resizeAll)
      sidebar.addEventListener('transitionend', this.resizeAll)
    }
  }

  updateStatusChart(online: number, moving: number, parked: number, offline: number): void {
    if (!this.charts.vehicleStatus) return
    this.charts.vehicleStatus.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: '0%',
        left: 'center',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 9 },
      },
      color: ['#10b981', '#3b82f6', '#f59e0b', '#64748b'],
      series: [
        {
          name: 'Trạng thái',
          type: 'pie',
          radius: ['38%', '68%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
          labelLine: { show: false },
          data: [
            { value: online, name: 'Trực tuyến' },
            { value: moving, name: 'Di chuyển' },
            { value: parked, name: 'Đỗ xe' },
            { value: offline, name: 'Ngoại tuyến' },
          ].filter((d) => d.value > 0),
        },
      ],
    })
  }

  updateOnlineTrend(onlineCount: number): void {
    if (!this.charts.onlineTrend) return

    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Thêm điểm dữ liệu mới
    this.onlineTrendData.push({ time: timeStr, value: onlineCount })

    // Giữ tối đa 50 điểm để biểu đồ không quá dày
    if (this.onlineTrendData.length > 50) this.onlineTrendData.shift()

    this.charts.onlineTrend.setOption({
      xAxis: { data: this.onlineTrendData.map((d) => d.time) },
      series: [{ data: this.onlineTrendData.map((d) => d.value) }],
    })
  }

  updateAlarmDistChart(alarms: AnyRow[] | null | undefined): void {
    if (!this.charts.alarmDist) return
    if (!alarms || !alarms.length) {
      this.charts.alarmDist.setOption({ title: NO_DATA_TITLE })
      return
    }

    const countMap: Record<string, number> = {}
    alarms.forEach((a) => {
      const k = a.armType || 'other'
      countMap[k] = (countMap[k] || 0) + 1
    })

    const data = Object.entries(countMap)
      .map(([k, v]) => ({
        value: v,
        name: (ALARM_NAME_MAP as Record<string, string>)[k] || `Loại ${k}`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    this.charts.alarmDist.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      color: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'],
      series: [
        {
          name: 'Loại báo động',
          type: 'pie',
          radius: '60%',
          center: ['50%', '48%'],
          data,
          label: { show: true, fontSize: 9, alignTo: 'edge', edgeDistance: '10%' },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
        },
      ],
    })
  }

  updateAlarmRankChart(alarms: AnyRow[] | null | undefined): void {
    if (!this.charts.alarmRank) return
    if (!alarms || !alarms.length) {
      this.charts.alarmRank.setOption({ title: NO_DATA_TITLE })
      return
    }

    const byPlate: Record<string, number> = {}
    alarms.forEach((a) => {
      const plate = a.vehiIdno || a.devIdno || 'N/A'
      byPlate[plate] = (byPlate[plate] || 0) + 1
    })

    const sorted = Object.entries(byPlate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
    const plates = sorted.map(([p]) => p)
    const counts = sorted.map(([, c]) => c)

    this.charts.alarmRank.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { fontSize: 9 } },
      yAxis: { type: 'category', data: plates.reverse(), axisLabel: { fontSize: 9 } },
      series: [
        {
          name: 'Báo động',
          type: 'bar',
          barWidth: '50%',
          itemStyle: { color: '#ef4444', borderRadius: [0, 4, 4, 0] },
          data: counts.reverse(),
        },
      ],
    })
  }

  updateMileageRankChart(mileageData: AnyRow[] | null | undefined): void {
    if (!this.charts.mileageRank) return
    if (!mileageData || !mileageData.length) {
      this.charts.mileageRank.setOption({ title: NO_DATA_TITLE })
      return
    }

    const plates = mileageData.map((d) => d.plate || d.vehiIdno || 'N/A')
    const km = mileageData.map((d) => parseFloat(d.mileage || d.distance || 0).toFixed(1))

    this.charts.mileageRank.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: plates, axisLabel: { fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { fontSize: 9 } },
      series: [
        {
          name: 'KM',
          type: 'bar',
          barWidth: '40%',
          itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
          data: km,
        },
      ],
    })
  }

  /** resizeAll / setTimeout(... c.resize(), 150) */
  resize(): void {
    Object.values(this.charts).forEach((c) => c && c.resize())
  }

  /** Bản gốc không bao giờ hủy; cần cho React unmount/StrictMode. onlineTrendData giữ nguyên như state module. */
  dispose(): void {
    window.removeEventListener('resize', this.resizeAll)
    if (this.sidebar) this.sidebar.removeEventListener('transitionend', this.resizeAll)
    this.sidebar = null
    Object.values(this.charts).forEach((c) => c && c.dispose())
    this.charts = {}
  }
}

/** Instance dùng chung với loaders (tương ứng biến module `_charts`). */
export const dashboardCharts = new DashboardChartsController()
