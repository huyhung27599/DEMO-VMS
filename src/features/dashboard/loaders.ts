/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../../shared/api/endpoints'
import { BASE_URL } from '../../shared/api/client'
import { dashboardCharts } from './chartsController'
import {
  ALARM_TYPE_MAP,
  formatTime,
  getSeverity,
  getStatusBadge,
  lastUpdatedText,
  normalizeId,
  today,
  todayDatetime,
} from './lib'
import { useDashboardStore, type DashboardState, type KpiValue } from './store'

// Port của dashboard.js:12-20 (state) và 41-74, 95-170, 398-690 (hiển thị + nạp dữ liệu).
// Các hàm nạp dữ liệu vẫn ghi vào state module và hiển thị (ở đây: store) theo đúng thứ tự gốc.

type Row = Record<string, any>

let _vehicles: Row[] = [] // Full vehicle list from API
let _cachedAlarms: Row[] = []
let _driverMapping: unknown = {} // Map devIdno -> driver name (bản gốc chỉ ghi, không đọc)

export function getVehicles(): Row[] {
  return _vehicles
}
export function getCachedAlarms(): Row[] {
  return _cachedAlarms
}
export function getDriverMapping(): unknown {
  return _driverMapping
}
export function resetDashboardModuleState(): void {
  _vehicles = []
  _cachedAlarms = []
  _driverMapping = {}
}

const set = (patch: Partial<DashboardState>) => useDashboardStore.setState(patch)

// ─── Helpers ──────────────────────────────────────────────────────────────
type KpiKey = keyof DashboardState['kpi']
function setKpi(key: KpiKey, value: KpiValue | null | undefined): void {
  const v = value !== null && value !== undefined ? value : '--'
  useDashboardStore.setState((s) => ({ kpi: { ...s.kpi, [key]: v } }))
}

type BarKey = keyof DashboardState['bars']
function setProgress(key: BarKey, pct: number): void {
  const w = Math.min(100, Math.max(0, pct))
  useDashboardStore.setState((s) => ({ bars: { ...s.bars, [key]: w } }))
}

function updateLastUpdated(): void {
  set({ lastUpdated: lastUpdatedText() })
}

// ─── Live Vehicles Table ──────────────────────────────────────────────────
export function renderVehicleTable(data: Row[], filter = ''): void {
  const rows = filter
    ? data.filter((v) => {
        const plate = (v.vehiIdno || v.vehi_idno || v.plate || '').toLowerCase()
        return plate.includes(filter.toLowerCase())
      })
    : data

  set({
    tableCount: `${rows.length} phương tiện`,
    // Ảnh chụp tại thời điểm gọi (bản gốc dựng innerHTML ngay lúc này)
    tableRows: rows.map((v) => ({
      plate: String(v.nm || v.vehiIdno || v.vehi_idno || v.plate || 'N/A'),
      badge: getStatusBadge(v),
    })),
  })
}

/** Ô tìm kiếm: input event -> renderVehicleTable(_vehicles, value) */
export function onVehicleSearch(value: string): void {
  set({ searchText: value })
  renderVehicleTable(_vehicles, value)
}

// ─── Alarm Feed ───────────────────────────────────────────────────────────
export function renderAlarmFeed(alarms: Row[] | null | undefined): void {
  if (!alarms || !alarms.length) {
    set({ alarmItems: [] })
    return
  }

  // Chỉ lấy 5 sự kiện mới nhất
  set({
    alarmItems: alarms.slice(0, 5).map((a) => {
      const plate = a.vehiIdno || a.devIdno || 'N/A'
      const type = ALARM_TYPE_MAP[a.armType as number] || `Báo động #${a.armType || '?'}`
      const time = a.begintime || a.alarmTime || null
      return {
        sev: getSeverity(a.armType),
        title: `${type} - ${plate}`,
        time: time ? formatTime(time) : '--',
      }
    }),
  })
}

// ─── Data Loading ─────────────────────────────────────────────────────────

export async function loadDriverMapping(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}driver/mapping`)
    if (res.ok) {
      _driverMapping = await res.json()
    }
  } catch (e) {
    console.warn('loadDriverMapping failed:', e)
  }
}

export async function loadVehicleStatus(): Promise<void> {
  try {
    // FleetsControl/808gps có nhiều biến thể payload:
    // - getDeviceStatus: { status: [{ id, ol, sp, vid, ... }] }  (có speed)
    // - getDeviceOlStatus: { onlines: [{ vid/did, online, vehicleId, ... }] } (chỉ online/offline)
    //
    // Ưu tiên getDeviceStatus để xác định "đang di chuyển" theo speed.
    const [stRes, olRes] = await Promise.allSettled([api.getDeviceStatus('', ''), api.getDeviceOlStatus('', '')])

    const resStatus = stRes.status === 'fulfilled' ? stRes.value : null
    const resOnline = olRes.status === 'fulfilled' ? olRes.value : null

    const statusRows: Row[] =
      resStatus && resStatus.result === 0 && Array.isArray(resStatus.status) ? (resStatus.status as Row[]) : []

    const onlineRows: Row[] =
      resOnline && resOnline.result === 0 && Array.isArray(resOnline.onlines) ? (resOnline.onlines as Row[]) : []

    // Map status by multiple identifiers
    const statusMap: Record<string, Row> = {}
    statusRows.forEach((s) => {
      const keys = [s.id, s.vid, s.vi, s.did, s.devIdno, s.DevIDNO].map(normalizeId).filter(Boolean)
      keys.forEach((k) => {
        statusMap[k] = s
      })
    })

    // Map online/offline (fallback) by multiple identifiers
    const onlineMap: Record<string, Row> = {}
    onlineRows.forEach((o) => {
      const keys = [o.vid, o.did, o.id, o.devIdno, o.DevIDNO, o.vehicleId ? String(o.vehicleId) : '']
        .map(normalizeId)
        .filter(Boolean)
      keys.forEach((k) => {
        onlineMap[k] = o
      })
    })

    // Cập nhật từng phương tiện trong danh sách hiển thị (_vehicles)
    // và tính KPI theo "danh sách xe" để luôn khớp Total (tránh lệch khi upstream chỉ trả partial list).
    let online = 0,
      offline = 0,
      moving = 0,
      parked = 0,
      onlineUnknown = 0

    _vehicles.forEach((v) => {
      const idsToTry: unknown[] = []

      // dl có thể là string (1 số API trả thẳng devIdno), hoặc array (thiết bị gắn với xe)
      if (typeof v.dl === 'string') {
        idsToTry.push(v.dl)
      } else if (Array.isArray(v.dl)) {
        v.dl.forEach((d: Row) => {
          if (!d) return
          if (d.id) idsToTry.push(d.id)
          if (d.devIdno) idsToTry.push(d.devIdno)
          if (d.DevIDNO) idsToTry.push(d.DevIDNO)
          if (d.idno) idsToTry.push(d.idno)
        })
      }

      idsToTry.push(v.devIdno, v.DevIDNO, v.did)
      idsToTry.push(v.vehiIdno, v.vehi_idno, v.nm, v.plate, v.id)

      const normalized = idsToTry.map(normalizeId).filter(Boolean)
      let s: Row | null = null
      for (const testId of normalized) {
        if (statusMap[testId]) {
          s = statusMap[testId]
          break
        }
      }

      if (s) {
        const isOnline =
          s.ol === 1 || s.ol === '1' || s.status === 1 || s.status === '1' || s.online === 1 || s.online === '1'
        v.ol = isOnline ? 1 : 0
        v.status = isOnline ? 1 : 0

        // sp thường tính theo 0.1km/h ở 808gps
        const spd = typeof s.speed === 'number' ? s.speed : typeof s.sp === 'number' ? s.sp / 10 : Number(s.sp)
        if (Number.isFinite(spd)) v.speed = Number(spd.toFixed(1))
        v.gpsTime = s.gt || s.gpsTime || s.st || s.lastUpdate
      } else {
        // fallback online/offline nếu chỉ có payload "onlines"
        const onlineHit = normalized.find((id) => onlineMap[id])
        const o = onlineHit ? onlineMap[onlineHit] : null
        if (o) {
          const isOnline = o.online === 1 || o.online === '1' || o.ol === 1 || o.ol === '1'
          v.ol = isOnline ? 1 : 0
          v.status = v.ol
          // Không có speed trong payload này
          v.speed = undefined
        } else {
          v.ol = 0
          v.status = 0
          v.speed = undefined
        }
      }

      if (v.ol === 1) {
        online += 1
        const spdNum = Number(v.speed)
        if (!Number.isFinite(spdNum)) {
          onlineUnknown += 1
        } else if (spdNum > 3) {
          moving += 1
        } else {
          parked += 1
        }
      } else {
        offline += 1
      }
    })

    // RENDER LẠI BẢNG NGAY LẬP TỨC: Đây là phần quan trọng nhất để cập nhật Trạng thái, Tốc độ, Thời gian
    renderVehicleTable(_vehicles, useDashboardStore.getState().searchText)

    const total = _vehicles.length || statusRows.length || onlineRows.length || 0
    const onlinePct = total ? Math.round((online / total) * 100) : 0
    const offlinePct = total ? Math.round((offline / total) * 100) : 0
    const movingPct = total ? Math.round((moving / total) * 100) : 0

    setKpi('online', online)
    setKpi('offline', offline)
    setKpi('moving', moving)

    set({ onlinePct, offlinePct })

    setProgress('online', onlinePct)
    setProgress('offline', offlinePct)
    setProgress('moving', movingPct)

    dashboardCharts.updateStatusChart(onlineUnknown, moving, parked, offline)
    dashboardCharts.updateOnlineTrend(online)
  } catch (e) {
    console.warn('loadVehicleStatus failed:', e)
  }
}

export async function loadVehicles(): Promise<void> {
  try {
    const res = await api.queryUserVehicle()
    if (!res || res.result !== 0) return

    const vehicles = (res.vehicles || res.vehicleList || res.infos || res.data || []) as Row[]
    _vehicles = Array.isArray(vehicles) ? vehicles : []

    setKpi('total', vehicles.length)
    renderVehicleTable(vehicles)

    // Trigger online status load now that we have vehicle list
    await loadVehicleStatus()
  } catch (e) {
    console.warn('loadVehicles failed:', e)
    // Try to show something from statuses if vehicles failed
    setKpi('total', '?')
  }
}

export async function loadAlarms(): Promise<void> {
  try {
    // “Báo động gần đây” lấy cùng nguồn với tab “Sự kiện AI” ở LiveView:
    // backend /api/syncAiEventsLocal → sync từ performanceReportPhotoListSafe rồi trả về 20 event mới nhất.
    // Chỉ liệt kê hành vi nghiêm trọng.
    const CRITICAL_AI_TYPES = [618, 620, 622, 624]

    const res = await api.syncAiEventsLocal('', '')
    const rows: Row[] = res && res.result === 0 && Array.isArray(res.events) ? (res.events as Row[]) : []

    const critical = rows
      .filter((e) => CRITICAL_AI_TYPES.map(String).includes(String(e.alarmType ?? e.ty ?? e.armType)))
      .map((e) => ({
        // normalize shape để tái sử dụng renderAlarmFeed/charts
        vehiIdno: e.vehiIdno || e.vi || e.vehicleName || '',
        devIdno: e.devIdno || e.did || '',
        armType: e.alarmType ?? e.ty ?? e.armType,
        begintime: e.fileTime || e.actualTime || e.updateTime || e.fileTimeStr || null,
        guid: e.id ? `ai-${e.id}` : undefined,
        position: e.position,
        images: e.images,
      }))
      .sort((a, b) => new Date(b.begintime || 0).getTime() - new Date(a.begintime || 0).getTime())

    _cachedAlarms = critical

    // KPI “Báo động hôm nay”: đếm theo ngày hiện tại từ local events (nghiêm trọng)
    const todayStr = today()
    const todayCount = critical.filter((a) => String(a.begintime || '').startsWith(todayStr)).length
    setKpi('alarms', todayCount)

    renderAlarmFeed(_cachedAlarms)
    dashboardCharts.updateAlarmDistChart(_cachedAlarms)
    dashboardCharts.updateAlarmRankChart(_cachedAlarms)
  } catch (e) {
    console.warn('loadAlarms failed:', e)
    setKpi('alarms', '0')
  }
}

export async function pollRealtimeAlarms(): Promise<void> {
  try {
    // Reuse cùng nguồn dữ liệu AI events. Tránh polling quá dày (interval được tăng ở init()).
    await loadAlarms()
  } catch (e) {
    console.warn('pollRealtimeAlarms failed:', e)
  }
}

export async function loadMileage(): Promise<void> {
  try {
    // Mileage API thường yêu cầu datetime đầy đủ, nếu chỉ truyền YYYY-MM-DD dễ bị trả 0 tùy server
    const endtime = todayDatetime(true)
    const begintime = todayDatetime(false)

    if (!_vehicles.length) return

    const mileageResults: { plate: any; vehiIdno: any; mileage: number }[] = []
    let totalKm = 0

    // Giới hạn concurrency để tránh "bắn" quá nhiều request cùng lúc
    const concurrency = 5
    let idx = 0
    const worker = async () => {
      while (idx < _vehicles.length) {
        const cur = _vehicles[idx++]
        const vId = cur.vehiIdno || cur.vehi_idno || cur.nm || cur.id
        if (!vId) continue
        const res = await api.runMileage(vId, begintime, endtime)
        if (res && res.result === 0 && Array.isArray(res.datas) && res.datas.length) {
          const km = (res.datas as Row[]).reduce((sum, d) => sum + parseFloat(d.mileage || 0), 0)
          const plate = cur.nm || cur.vehiIdno || cur.id
          mileageResults.push({ plate, vehiIdno: vId, mileage: km })
          totalKm += km
        }
      }
    }
    await Promise.allSettled(Array.from({ length: concurrency }, () => worker()))

    if (totalKm > 0) {
      setKpi('mileage', Math.round(totalKm).toLocaleString('vi-VN'))
      // Progress bar: so với ngưỡng "tổng km / (top1 km * số xe)" để không luôn 100%
      const maxKm = Math.max(...mileageResults.map((d) => d.mileage), 1)
      const denom = Math.max(1, maxKm * Math.max(1, mileageResults.length))
      setProgress('mileage', Math.round((totalKm / denom) * 100))
    } else {
      setKpi('mileage', '0')
    }

    mileageResults.sort((a, b) => b.mileage - a.mileage)
    dashboardCharts.updateMileageRankChart(mileageResults.slice(0, 8))
  } catch (e) {
    console.warn('loadMileage failed:', e)
  }
}

// ─── Full Refresh ─────────────────────────────────────────────────────────
export async function refresh(): Promise<void> {
  set({ refreshing: true }) // refreshBtn.classList.add('spinning')

  try {
    // Load in parallel where possible
    await Promise.allSettled([loadVehicles(), loadDriverMapping()])
    await Promise.allSettled([loadAlarms(), loadMileage()])
    updateLastUpdated()
  } finally {
    set({ refreshing: false })
  }
}
