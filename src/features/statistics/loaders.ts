import { api } from '../../shared/api/endpoints'
import { hideLoader, showLoader } from '../../shared/ui/loaderStore'
import { showToast } from '../../shared/ui/toastStore'
import { statisticsCharts } from './chartsController'
import {
  ALARM_IDS,
  ALARM_TYPES,
  ITEMS_PER_PAGE,
  countByVehicle,
  dedupeAlarmRows,
  exportCSV,
  extractEvidenceAlarmRows,
  extractSafetyAlarmRows,
  formatDt,
  getAlarmCode,
  getFilteredEvents as filterEvents,
  needsEvidenceSupplement,
  normalizeAlarmEvent,
  readTableSearchValue,
  type AnyRow,
} from './lib'
import { useStatisticsStore, type DateBtn } from './store'
import { buildReportOptions, mileKm } from './reports'

// Port events.js: init, loadStatistics và các handler. Biến module nằm trong useStatisticsStore,
// đọc/ghi đúng thời điểm như bản gốc (vd. allEvents ghi trước fetchMileageStats, updateCharts đọc
// currentPeriod/isCustomDate lúc tải xong).

const get = useStatisticsStore.getState
const set = useStatisticsStore.setState

export async function fetchSafetyAlarmRange(start: Date, end: Date): Promise<AnyRow[]> {
  const beginStr = formatDt(start)
  const endStr = formatDt(end)
  const pageRecords = 200
  let page = 1
  let collected: AnyRow[] = []
  while (page <= 20) {
    const res = await api.querySafetyAlarm(beginStr, endStr, ALARM_IDS, '', page, pageRecords)
    if (!res || res.result !== 0) break
    const rows = extractSafetyAlarmRows(res)
    if (!rows.length) break
    collected = collected.concat(rows)
    if (rows.length < pageRecords) break
    page += 1
  }

  if (needsEvidenceSupplement(collected)) {
    try {
      const evRes = await api.performanceReportPhotoListSafe(beginStr, endStr, ALARM_IDS, '0', '', '')
      const evRows = extractEvidenceAlarmRows(evRes)
      if (evRows.length) collected = [...collected, ...evRows]
    } catch (e) {
      console.warn('[Events] evidence supplement:', e)
    }
  }

  return dedupeAlarmRows(collected)
}

export async function fetchMileageStats(
  vehicles: AnyRow[],
  start: Date,
  end: Date,
): Promise<{ totalKm: number; kmPer100: number }> {
  if (!vehicles.length) return { totalKm: 0, kmPer100: 0 }
  const beginStr = formatDt(start)
  const endStr = formatDt(end)
  let idx = 0
  let totalKm = 0
  const concurrency = 4
  const worker = async () => {
    while (idx < vehicles.length) {
      const v = vehicles[idx++]
      const vehiIdno = v.vehiIdno || v.nm || v.id
      if (!vehiIdno) continue
      try {
        const res = await api.runMileage(vehiIdno, beginStr, endStr)
        // 808gps trả infos[].mile (mét); giữ datas[].mileage (km) cho định dạng cũ
        const rows = Array.isArray(res?.infos) ? res.infos : Array.isArray(res?.datas) ? res.datas : null
        if (res && res.result === 0 && rows) {
          totalKm += rows.reduce((s: number, d: AnyRow) => s + mileKm(d), 0)
        }
      } catch {
        /* bỏ qua như bản gốc */
      }
    }
  }
  await Promise.allSettled(Array.from({ length: concurrency }, () => worker()))
  // allEvents đọc lúc này (biến module — có thể đã bị một lần tải song song khác ghi đè, như bản gốc)
  const kmPer100 = totalKm > 0 ? (get().allEvents.length * 100) / totalKm : 0
  return { totalKm, kmPer100 }
}

export async function loadStatistics(): Promise<void> {
  showLoader()
  try {
    const s = get()
    let end = new Date()
    let start = new Date(end.getTime() - s.currentPeriod * 24 * 60 * 60 * 1000)
    if (s.isCustomDate) {
      start = s.customStartDate as Date
      end = s.customEndDate as Date
    }

    set({ lastUpdate: new Date().toLocaleString() })

    const vehicleData = await api.queryUserVehicle()
    const vehicles: AnyRow[] =
      vehicleData && vehicleData.result === 0 && Array.isArray(vehicleData.vehicles) ? vehicleData.vehicles : []
    const vehiclesCount = vehicles.length
    set({ reportOptions: buildReportOptions(vehicleData) })
    const vehicleMap: Record<string, string> = {}
    vehicles.forEach((v) => {
      const name = v.nm || v.vehiIdno || v.id || 'N/A'
      const keys = [v.vehiIdno, v.nm, v.id]
      if (Array.isArray(v.dl)) {
        v.dl.forEach((d: AnyRow) => {
          if (d?.id) keys.push(d.id)
          if (d?.devIdno) keys.push(d.devIdno)
        })
      } else if (typeof v.dl === 'string') {
        keys.push(v.dl)
      }
      keys.filter(Boolean).forEach((k) => {
        vehicleMap[String(k)] = name
      })
    })

    const rawEvents = await fetchSafetyAlarmRange(start, end)
    set({ allEvents: rawEvents.map((e) => normalizeAlarmEvent(e, vehicleMap)).sort((a, b) => b.stm - a.stm) })

    const mileageStats = await fetchMileageStats(vehicles, start, end)
    updateKPIs(vehiclesCount, mileageStats)
    updateCharts()
    updateLeaderboard()
    generateInsights()

    set({ currentPage: 1 })
    renderTable()
  } catch (e) {
    console.error('Error loading stats', e)
  } finally {
    hideLoader()
  }
}

export function updateKPIs(totalVehicles: number, mileageStats = { totalKm: 0, kmPer100: 0 }): void {
  const { allEvents } = get()

  // Safety score pseudo-calculation
  // Base 100, lose points per violation
  const avgScore = Math.max(0, 100 - (allEvents.length * 2) / (totalVehicles || 1))

  // Violation per 100km (real mileage from API runMileage)
  const vPer100 = Number(mileageStats.kmPer100 || 0).toFixed(2)

  // Safety Rate (% safe drivers/vehicles)
  const offendingVehicles = new Set(allEvents.map((e) => e.vehicleName).filter(Boolean)).size
  const safeVehicles = Math.max(0, totalVehicles - offendingVehicles)
  const safeRate = totalVehicles > 0 ? ((safeVehicles / totalVehicles) * 100).toFixed(1) : 100

  // Top violation
  const countMap: Record<string, number> = {}
  allEvents.forEach((e) => {
    const t = getAlarmCode(e) || e.ty
    countMap[t] = (countMap[t] || 0) + 1
  })

  let topVId: string | null = null
  let topVCount = 0
  for (const [k, v] of Object.entries(countMap)) {
    if (v > topVCount) {
      topVCount = v
      topVId = k
    }
  }

  let topViolation = 'N/A'
  let topPct = '--'
  const topName = topVId ? (ALARM_TYPES as Record<string, string>)[topVId] : undefined
  if (topVId && topName) {
    topViolation = topName
    topPct = ((topVCount / allEvents.length) * 100).toFixed(1)
  }

  set({
    kpis: {
      total: allEvents.length,
      avgScore: avgScore.toFixed(1),
      per100: vPer100,
      safetyRate: safeRate + '%',
      safeDrivers: safeVehicles,
      topViolation,
      topPct,
    },
  })
}

export function updateCharts(): void {
  const s = get()
  statisticsCharts.updateCharts(s.allEvents, s)
}

export function updateLeaderboard(): void {
  const type = get().leaderboardType || 'worst'
  const sortedVeh = countByVehicle(get().allEvents)

  if (type === 'best') {
    sortedVeh.reverse()
  }

  set({ leaderboard: { type, items: sortedVeh.slice(0, 5) } })
}

/**
 * generateInsights (events.js:873-926): ghi vào #stat-ai-insights — phần tử này không có trong index.html,
 * nên bản gốc luôn return ở dòng đầu. Giữ là no-op.
 */
export function generateInsights(): void {
  // const container = document.getElementById('stat-ai-insights'); if (!container) return;
}

/** getFilteredEvents: đọc giá trị lọc/tìm kiếm hiện tại (như đọc DOM) và allEvents hiện tại. */
export function getFilteredEvents(): AnyRow[] {
  const s = get()
  return filterEvents(s.allEvents, s.filterType || 'ALL', readTableSearchValue(s.search))
}

export function renderTable(): void {
  const filtered = getFilteredEvents()

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  let currentPage = get().currentPage
  if (currentPage > totalPages) currentPage = totalPages
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const items = filtered.slice(startIndex, endIndex)

  set({
    currentPage,
    table: {
      items,
      page: currentPage,
      totalPages,
      prevDisabled: currentPage === 1,
      nextDisabled: currentPage === totalPages,
    },
  })
}

export function applyTableFilters(): void {
  set({ currentPage: 1 })
  renderTable()
}

// ── Handler của các listener trong init() (events.js:85-156)

export function onDateBtnClick(days: Exclude<DateBtn, 'custom'>): void {
  set({ activeDateBtn: days, customPickerVisible: false, currentPeriod: days, isCustomDate: false })
  void loadStatistics()
}

export function onCustomBtnClick(): void {
  set({ activeDateBtn: 'custom', customPickerVisible: true })

  if (!get().customStartInput) {
    const now = new Date()
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    set({
      customStartInput: new Date(past.getTime() - past.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      customEndInput: new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    })
  }
}

export function onCustomApplyClick(): void {
  const { customStartInput, customEndInput } = get()
  if (!customStartInput || !customEndInput) {
    showToast('Vui lòng chọn đầy đủ thời gian', 'warning')
    return
  }
  // Bản gốc ghi customStartDate/customEndDate TRƯỚC khi kiểm tra hợp lệ
  const customStartDate = new Date(customStartInput)
  const customEndDate = new Date(customEndInput)
  set({ customStartDate, customEndDate })

  if (customStartDate >= customEndDate) {
    showToast('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc', 'warning')
    return
  }

  set({ isCustomDate: true })
  void loadStatistics()
}

export function onPrevClick(): void {
  const { currentPage } = get()
  if (currentPage > 1) {
    set({ currentPage: currentPage - 1 })
    renderTable()
  }
}

export function onNextClick(): void {
  const maxPages = Math.ceil(getFilteredEvents().length / ITEMS_PER_PAGE)
  const { currentPage } = get()
  if (currentPage < maxPages) {
    set({ currentPage: currentPage + 1 })
    renderTable()
  }
}

export function onLeaderboardTypeChange(value: string): void {
  set({ leaderboardType: value })
  updateLeaderboard()
}

export function onFilterTypeChange(value: string): void {
  set({ filterType: value })
  applyTableFilters()
}

export function onSearchInput(value: string): void {
  set({ search: value })
  applyTableFilters()
}

/** renderTable: tr.addEventListener('click', () => openEventModal(e, dateStr)) */
export function openEventModal(event: AnyRow, dateStr: string): void {
  set({ modal: { event, dateStr } })
}

/** #stat-modal-close: ẩn modal + xóa media */
export function closeEventModal(): void {
  set({ modal: null })
}

/** Phần tải file của events.js:exportCSV. */
export function downloadCSV(csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `BaoCao_AI_PhuongTien_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** #stat-export-btn click — events.js:exportCSV */
export function onExportClick(): void {
  const filtered = getFilteredEvents()
  if (filtered.length === 0) {
    showToast('Không có dữ liệu để xuất', 'info')
    return
  }
  downloadCSV(exportCSV(filtered))
}

// ── init (events.js:75-168): lần showApp đầu. Listener được gắn bằng JSX; biểu đồ do component init
// (cần ref) ngay trước khi gọi hàm này. Guard cấp module vì StrictMode chạy effect hai lần.
let isInitialized = false

export function initStatistics(): void {
  if (isInitialized) return
  isInitialized = true
  void loadStatistics()
}

/** Chỉ dùng trong test. */
export function resetStatisticsInit(): void {
  isInitialized = false
}
