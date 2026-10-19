import * as echarts from 'echarts'
import { countByVehicle, getViolationDisplayName, type AnyRow } from './lib'

// Port của events.js:initCharts/resizeCharts/updateCharts (biến module trendChart, pieChart, barChart).
// Option ECharts chép nguyên.

export type StatChartElements = {
  trend: HTMLElement | null
  pie: HTMLElement | null
  bar: HTMLElement | null
}

export type ChartPeriod = {
  isCustomDate: boolean
  customStartDate: Date | null
  customEndDate: Date | null
  currentPeriod: number
}

export class StatisticsChartsController {
  private trendChart: echarts.ECharts | undefined
  private pieChart: echarts.ECharts | undefined
  private barChart: echarts.ECharts | undefined
  private onResize = () => this.resizeCharts()

  /** initCharts() + listener window 'resize' (events.js:158-163). */
  initCharts(els: StatChartElements): void {
    if (els.trend && !this.trendChart) this.trendChart = echarts.init(els.trend)
    if (els.pie && !this.pieChart) this.pieChart = echarts.init(els.pie)
    if (els.bar && !this.barChart) this.barChart = echarts.init(els.bar)

    // Listen to resize
    window.removeEventListener('resize', this.onResize)
    window.addEventListener('resize', this.onResize, { passive: true })
  }

  resizeCharts(): void {
    if (this.trendChart) this.trendChart.resize()
    if (this.pieChart) this.pieChart.resize()
    if (this.barChart) this.barChart.resize()
  }

  updateCharts(allEvents: AnyRow[], p: ChartPeriod): void {
    const { trendChart, pieChart, barChart } = this
    if (!trendChart || !pieChart || !barChart) return

    const trendMap: Record<string, number> = {}
    const effectiveDays = p.isCustomDate
      ? Math.max(1, ((p.customEndDate as Date).getTime() - (p.customStartDate as Date).getTime()) / (24 * 3600 * 1000))
      : p.currentPeriod
    const isHourly = effectiveDays <= 1
    const refDate = p.isCustomDate ? (p.customEndDate as Date) : new Date()

    if (isHourly) {
      for (let h = 0; h < 24; h++) {
        const key = h.toString().padStart(2, '0') + ':00'
        trendMap[key] = 0
      }
    } else {
      const days = Math.ceil(effectiveDays)
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(refDate.getTime() - i * 24 * 60 * 60 * 1000)
        const key = d.toLocaleDateString('vi-VN')
        trendMap[key] = 0
      }
    }

    allEvents.forEach((e) => {
      const dp = new Date(e.stm * 1000)
      let keyStr: string
      if (isHourly) {
        keyStr = dp.getHours().toString().padStart(2, '0') + ':00'
      } else {
        keyStr = dp.toLocaleDateString('vi-VN')
      }
      if (keyStr in trendMap) {
        trendMap[keyStr] = (trendMap[keyStr] || 0) + 1
      }
    })

    const trendKeys = Object.keys(trendMap)
    const trendVals = trendKeys.map((k) => trendMap[k])

    const trendOption = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: trendKeys, boundaryGap: false },
      yAxis: { type: 'value' },
      series: [
        {
          data: trendVals,
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.2,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.5)' },
              { offset: 1, color: 'rgba(59,130,246,0.05)' },
            ]),
          },
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 3 },
        },
      ],
    }
    trendChart.setOption(trendOption)

    const typeMap: Record<string, number> = {}
    allEvents.forEach((e) => {
      const n = getViolationDisplayName(e)
      if (n) {
        typeMap[n] = (typeMap[n] || 0) + 1
      }
    })

    const sortedTypes = Object.entries(typeMap)
      .filter((item) => item[1] > 0)
      .sort((a, b) => b[1] - a[1])
    const barXData = sortedTypes.map((item) => item[0])
    const barYData = sortedTypes.map((item) => item[1])

    const barOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: barXData,
        axisLabel: {
          interval: 0,
          rotate: barXData.length > 5 ? 30 : 0,
          formatter: function (value: string) {
            return value.length > 15 ? value.substring(0, 15) + '...' : value
          },
        },
      },
      yAxis: { type: 'value' },
      series: [
        {
          data: barYData,
          type: 'bar',
          barMaxWidth: 50,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#f59e0b' },
              { offset: 1, color: '#d97706' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    }
    barChart.setOption(barOption)

    const sortedVeh = countByVehicle(allEvents)
    let pieData: { name: string; value: number }[]
    if (sortedVeh.length > 5) {
      pieData = sortedVeh.slice(0, 4).map((v) => ({ name: v[0], value: v[1] }))
      const others = sortedVeh.slice(4).reduce((sum, item) => sum + item[1], 0)
      pieData.push({ name: 'Khác', value: others })
    } else {
      pieData = sortedVeh.map((v) => ({ name: v[0], value: v[1] }))
    }

    const pieOption = {
      tooltip: { trigger: 'item' },
      legend: { bottom: '0%' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: pieData,
        },
      ],
    }
    pieChart.setOption(pieOption)
  }

  /** Bản gốc không bao giờ hủy; cần cho React unmount/StrictMode. */
  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    this.trendChart?.dispose()
    this.pieChart?.dispose()
    this.barChart?.dispose()
    this.trendChart = undefined
    this.pieChart = undefined
    this.barChart = undefined
  }
}

export const statisticsCharts = new StatisticsChartsController()
