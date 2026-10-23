/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../../shared/api/endpoints'
import { BASE_URL } from '../../shared/api/client'
import {
  ALARM_NAME_MAP,
  ALARM_TYPE_MAP,
  alertLevelFromSeverity,
  formatClock,
  getSeverity,
  lastUpdatedText,
  normalizeId,
  today,
} from './lib'
import { ALERT_BAR_COLORS } from './mockData'
import {
  useDashboardStore,
  type AlarmTypeBar,
  type DashboardState,
  type KpiValue,
  type LatestAlertRow,
  type TopAlertVehicle,
} from './store'

type Row = Record<string, any>

let _vehicles: Row[] = []
let _cachedAlarms: Row[] = []
let _driverMapping: Record<string, string> = {}

export function getVehicles(): Row[] {
  return _vehicles
}
export function getCachedAlarms(): Row[] {
  return _cachedAlarms
}
export function getDriverMapping(): Record<string, string> {
  return _driverMapping
}
export function resetDashboardModuleState(): void {
  _vehicles = []
  _cachedAlarms = []
  _driverMapping = {}
}

const set = (patch: Partial<DashboardState>) => useDashboardStore.setState(patch)

type KpiKey = keyof DashboardState['kpi']
function setKpi(key: KpiKey, value: KpiValue | null | undefined): void {
  const v = value !== null && value !== undefined ? value : '--'
  useDashboardStore.setState((s) => ({ kpi: { ...s.kpi, [key]: v } }))
}

function updateLastUpdated(): void {
  set({ lastUpdated: lastUpdatedText() })
}

function resolveDriverName(plate: string, devIdno: string): string {
  const map = _driverMapping
  const candidates = [plate, normalizeId(plate), devIdno, normalizeId(devIdno)].filter(Boolean)
  for (const key of candidates) {
    if (map[key]) return map[key]
  }
  for (const [k, name] of Object.entries(map)) {
    if (plate && (k.includes(plate) || plate.includes(k))) return name
  }
  return '—'
}

/** Build bar / top / table from cached alarms (real API). Empty → empty state. */
export function renderAlarmViews(alarms: Row[] | null | undefined): void {
  if (!alarms || !alarms.length) {
    set({ alarmTypeBars: [], topVehicles: [], latestAlerts: [] })
    return
  }

  const countByType: Record<string, number> = {}
  alarms.forEach((a) => {
    const k = String(a.armType ?? 'other')
    countByType[k] = (countByType[k] || 0) + 1
  })

  const alarmTypeBars: AlarmTypeBar[] = Object.entries(countByType)
    .map(([k, count], i) => ({
      name: ALARM_NAME_MAP[Number(k)] || ALARM_TYPE_MAP[Number(k)] || `Loại ${k}`,
      count,
      color: ALERT_BAR_COLORS[i % ALERT_BAR_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const byPlate: Record<string, number> = {}
  alarms.forEach((a) => {
    const plate = String(a.vehiIdno || a.devIdno || 'N/A')
    byPlate[plate] = (byPlate[plate] || 0) + 1
  })

  const topVehicles: TopAlertVehicle[] = Object.entries(byPlate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([plate, count], i) => ({
      rank: i + 1,
      plate,
      driver: resolveDriverName(plate, ''),
      count,
    }))

  const latestAlerts: LatestAlertRow[] = alarms.slice(0, 8).map((a, i) => {
    const plate = String(a.vehiIdno || a.devIdno || 'N/A')
    const armType = a.armType
    const type = ALARM_TYPE_MAP[armType as number] || ALARM_NAME_MAP[armType as number] || `Báo động #${armType ?? '?'}`
    const sev = getSeverity(armType)
    return {
      id: String(a.guid || `${plate}-${a.begintime || i}`),
      time: a.begintime ? formatClock(a.begintime) : '--',
      plate,
      driver: resolveDriverName(plate, String(a.devIdno || '')),
      type,
      level: alertLevelFromSeverity(sev),
    }
  })

  set({ alarmTypeBars, topVehicles, latestAlerts })
}

export async function loadDriverMapping(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}driver/mapping`)
    if (res.ok) {
      const data = await res.json()
      _driverMapping = data && typeof data === 'object' ? (data as Record<string, string>) : {}
    }
  } catch (e) {
    console.warn('loadDriverMapping failed:', e)
  }
}

export async function loadDriversKpi(): Promise<void> {
  try {
    const res = await api.queryDriverList('')
    const list: Row[] =
      res && res.result === 0 && Array.isArray(res.infos) ? (res.infos as Row[]) : []
    const total = list.length
    setKpi('totalDrivers', total)

    // "Đang hoạt động": số xe online có gắn tài xế (mapping), tối đa = tổng tài xế
    const online = Number(useDashboardStore.getState().kpi.onlineVehicles)
    const onlineNum = Number.isFinite(online) ? online : 0
    const mappedOnline = _vehicles.filter((v) => {
      const ol = v.ol === 1 || v.ol === '1'
      if (!ol) return false
      const plate = String(v.nm || v.vehiIdno || '')
      const dev = typeof v.dl === 'string' ? v.dl : ''
      return resolveDriverName(plate, dev) !== '—'
    }).length
    const active = Math.min(total, Math.max(mappedOnline, Math.min(onlineNum, total)))
    setKpi('activeDrivers', active)
  } catch (e) {
    console.warn('loadDriversKpi failed:', e)
    setKpi('totalDrivers', '--')
    setKpi('activeDrivers', '--')
  }
}

export async function loadVehicleStatus(): Promise<void> {
  try {
    const [stRes, olRes] = await Promise.allSettled([api.getDeviceStatus('', ''), api.getDeviceOlStatus('', '')])

    const resStatus = stRes.status === 'fulfilled' ? stRes.value : null
    const resOnline = olRes.status === 'fulfilled' ? olRes.value : null

    const statusRows: Row[] =
      resStatus && resStatus.result === 0 && Array.isArray(resStatus.status) ? (resStatus.status as Row[]) : []

    const onlineRows: Row[] =
      resOnline && resOnline.result === 0 && Array.isArray(resOnline.onlines) ? (resOnline.onlines as Row[]) : []

    const statusMap: Record<string, Row> = {}
    statusRows.forEach((s) => {
      ;[s.id, s.vid, s.vi, s.did, s.devIdno, s.DevIDNO].map(normalizeId).filter(Boolean).forEach((k) => {
        statusMap[k] = s
      })
    })

    const onlineMap: Record<string, Row> = {}
    onlineRows.forEach((o) => {
      ;[o.vid, o.did, o.id, o.devIdno, o.DevIDNO, o.vehicleId ? String(o.vehicleId) : '']
        .map(normalizeId)
        .filter(Boolean)
        .forEach((k) => {
          onlineMap[k] = o
        })
    })

    let online = 0
    let offline = 0

    _vehicles.forEach((v) => {
      const idsToTry: unknown[] = []

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

      idsToTry.push(v.devIdno, v.DevIDNO, v.did, v.vehiIdno, v.vehi_idno, v.nm, v.plate, v.id)

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
        const spd = typeof s.speed === 'number' ? s.speed : typeof s.sp === 'number' ? s.sp / 10 : Number(s.sp)
        if (Number.isFinite(spd)) v.speed = Number(spd.toFixed(1))
      } else {
        const onlineHit = normalized.find((id) => onlineMap[id])
        const o = onlineHit ? onlineMap[onlineHit] : null
        if (o) {
          const isOnline = o.online === 1 || o.online === '1' || o.ol === 1 || o.ol === '1'
          v.ol = isOnline ? 1 : 0
          v.status = v.ol
        } else {
          v.ol = 0
          v.status = 0
        }
      }

      if (v.ol === 1) online += 1
      else offline += 1
    })

    void offline
    setKpi('onlineVehicles', online)

    // KPI thiết bị: mỗi dòng getDeviceStatus là một thiết bị; không có thì dùng getDeviceOlStatus
    const isOl = (r: Row) => [r.ol, r.online].some((x) => x === 1 || x === '1')
    const devRows = statusRows.length ? statusRows : onlineRows
    const devOnline = devRows.filter(isOl).length
    setKpi('devicesTotal', devRows.length)
    setKpi('devicesOnline', devOnline)
    setKpi('devicesLost', devRows.length - devOnline)
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

    setKpi('totalVehicles', _vehicles.length)
    await loadVehicleStatus()
  } catch (e) {
    console.warn('loadVehicles failed:', e)
    setKpi('totalVehicles', '?')
  }
}

export async function loadAlarms(): Promise<void> {
  try {
    const CRITICAL_AI_TYPES = [618, 620, 622, 624]

    const res = await api.syncAiEventsLocal('', '')
    const rows: Row[] = res && res.result === 0 && Array.isArray(res.events) ? (res.events as Row[]) : []

    const critical = rows
      .filter((e) => CRITICAL_AI_TYPES.map(String).includes(String(e.alarmType ?? e.ty ?? e.armType)))
      .map((e) => ({
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

    const todayStr = today()
    const todayCount = critical.filter((a) => String(a.begintime || '').startsWith(todayStr)).length
    setKpi('alarmsToday', todayCount)
    // Delta vs hôm qua: syncAiEventsLocal trả sự kiện nhiều ngày, đếm ngày hôm qua từ cùng danh sách
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    const yesterdayCount = critical.filter((a) => String(a.begintime || '').startsWith(yesterdayStr)).length
    useDashboardStore.setState((s) => ({
      kpi: { ...s.kpi, alarmsDelta: todayCount - yesterdayCount },
    }))

    renderAlarmViews(_cachedAlarms)
  } catch (e) {
    console.warn('loadAlarms failed:', e)
    setKpi('alarmsToday', '0')
  }
}

export async function pollRealtimeAlarms(): Promise<void> {
  try {
    await loadAlarms()
  } catch (e) {
    console.warn('pollRealtimeAlarms failed:', e)
  }
}

export async function refresh(): Promise<void> {
  set({ refreshing: true })

  try {
    await Promise.allSettled([loadVehicles(), loadDriverMapping()])
    await Promise.allSettled([loadAlarms(), loadDriversKpi()])
    updateLastUpdated()
  } finally {
    set({ refreshing: false })
  }
}
