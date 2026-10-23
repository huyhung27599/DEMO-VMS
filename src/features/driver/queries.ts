import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { queryClient } from '../../shared/query/queryClient'
import type { DatePickerController } from './datePickerController'
import {
  checkFaceServiceHealth,
  fetchIdentifyAlarmsMerged,
  loadDriverMapping,
  type FaceHealthStatus,
} from './faceEvents'
import { apiResultOk, dedupeFaceEventsMerged, mapLocalFaceLogToEvent, normalizeUnixSeconds, type Loose } from './lib'
import { renderDrivers, setDriversData, updateTimestamp, useDriverStore } from './store'
import { aiEventTime, aiEventToAlert } from '../vehicle/meta'

export const DRIVERS_CACHE_KEY = 'drivers_cache'

export const driverKeys = {
  all: ['driver'] as const,
  drivers: ['driver', 'drivers'] as const,
  faceEvents: (begin: string, end: string) => ['driver', 'faceEvents', { begin, end }] as const,
  faceHealth: ['driver', 'faceHealth'] as const,
}

/** Phản hồi queryDriverList không hợp lệ: thông điệp hiển thị nguyên văn trong #driver-grid. */
export class DriverListError extends Error {}

/** localStorage 'drivers_cache' (JSON mảng tài xế) */
export function readDriversCache(): Loose[] | undefined {
  const cached = localStorage.getItem(DRIVERS_CACHE_KEY)
  if (!cached) return undefined
  try {
    const parsed = JSON.parse(cached)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function writeDriversCache(driversData: Loose[]): void {
  localStorage.setItem(DRIVERS_CACHE_KEY, JSON.stringify(driversData))
}

/**
 * driver.js:932-944 (phần mạng của loadDrivers). Thành công -> ghi lại drivers_cache.
 * initialData = drivers_cache, initialDataUpdatedAt 0: dữ liệu cache luôn "cũ" nên fetchQuery luôn gọi API.
 * Không dùng với useQuery (bản gốc không nạp lúc mount) — loadDrivers() gọi qua fetchQuery.
 */
export function driversQueryOptions() {
  return queryOptions({
    queryKey: driverKeys.drivers,
    queryFn: async (): Promise<Loose[]> => {
      const res: Loose = await api.queryDriverList()
      const ok = res && (res.result === 0 || res.result === '0')
      const list = ok ? res.infos || res.info || res.data || res.rows || [] : []
      if (ok && Array.isArray(list)) {
        writeDriversCache(list)
        return list
      }
      throw new DriverListError(`Lỗi: ${res?.msg || 'Không tải được danh sách tài xế'}`)
    },
    initialData: readDriversCache,
    initialDataUpdatedAt: 0,
  })
}

// ─── Load Drivers (driver.js:906-951) ──────────────────────────────────────
export async function loadDrivers(): Promise<void> {
  if (useDriverStore.getState().isLoadingDrivers) return
  useDriverStore.setState({ isLoadingDrivers: true })

  // Đảm bảo mapping được load TRƯỚC khi render để folder path luôn đúng
  await loadDriverMapping()

  // Instant UI from local cache (mapping đã sẵn sàng nên folder path nhất quán)
  const cachedDrivers = localStorage.getItem(DRIVERS_CACHE_KEY)
  if (cachedDrivers) {
    try {
      const parsed = JSON.parse(cachedDrivers)
      // bản gốc: drivers.map ném lỗi khi cache không phải mảng -> bị catch, bỏ qua
      if (!Array.isArray(parsed)) throw new TypeError('drivers_cache is not an array')
      setDriversData(parsed)
      renderDrivers(parsed)
      updateTimestamp()
    } catch {
      /* ignore */
    }
  } else {
    useDriverStore.setState({ gridView: { kind: 'loading' } })
  }

  try {
    const list = await queryClient.fetchQuery(driversQueryOptions())
    setDriversData(list)
    renderDrivers(list)
    updateTimestamp()
  } catch (err: Loose) {
    if (err instanceof DriverListError) {
      useDriverStore.setState({ gridView: { kind: 'error', message: err.message } })
    } else {
      console.error('[driver.js] loadDrivers error:', err)
      useDriverStore.setState({
        gridView: { kind: 'error', message: `Lỗi kết nối API: ${err?.message || err}` },
      })
    }
  } finally {
    useDriverStore.setState({ isLoadingDrivers: false })
  }
}

// ─── Check AI Service Health (driver.js:837-903, phần DOM) ────────────────
export function faceHealthQueryOptions() {
  return queryOptions({
    queryKey: driverKeys.faceHealth,
    queryFn: (): Promise<FaceHealthStatus> => checkFaceServiceHealth(),
  })
}

/** checkFaceServiceHealth bản gốc: hiện spinner rồi ghi kết quả vào banner. */
export async function showFaceServiceHealth(): Promise<void> {
  useDriverStore.setState((s) => ({ faceHealth: { ...s.faceHealth, phase: 'checking' } }))
  const r = await queryClient.fetchQuery(faceHealthQueryOptions())
  useDriverStore.setState({ faceHealth: { phase: 'done', ...r } })
}

// ─── Face Events Tab (driver.js:1177-1277) ────────────────────────────────
/** Hai nguồn: nhật ký cục bộ + upstream 808gps, gộp, bỏ trùng, sắp xếp mới nhất trước. */
export function faceEventsQueryOptions(begin: string, end: string) {
  return queryOptions({
    queryKey: driverKeys.faceEvents(begin, end),
    queryFn: async (): Promise<Loose[]> => {
      let combined: Loose[] = []

      // ── Nguồn 1: Local DB (nhật ký nhận diện khuôn mặt LiveView ~10s) ──
      try {
        const localRes: Loose = await api.listFaceRecognitionLogs(begin, end, { limit: 2000 })
        if (apiResultOk(localRes) && Array.isArray(localRes.events)) {
          // totalRecognitionCount/localCount của bản gốc không được hiển thị
          const localEvents = localRes.events.map((row: Loose) => mapLocalFaceLogToEvent(row, api.BASE_URL))
          combined.push(...localEvents)
        }
      } catch (localErr: Loose) {
        console.warn('[driver.js] Local face logs error:', localErr.message || localErr)
      }

      // ── Nguồn 2: Upstream 808gps (queryIdentifyAlarm + querySafetyEvidence) ──
      try {
        const upstreamRes = await fetchIdentifyAlarmsMerged(api, begin, end)
        if (upstreamRes && Array.isArray(upstreamRes.events) && upstreamRes.events.length > 0) {
          combined.push(...upstreamRes.events)
        }
      } catch (upErr: Loose) {
        console.warn('[driver.js] Upstream face events error:', upErr.message || upErr)
      }

      // ── Dedupe + Sort ──
      combined = dedupeFaceEventsMerged(combined)
      combined.sort((x, y) => {
        const ax = normalizeUnixSeconds(x.st ?? x.stm ?? x.startTime) ?? 0
        const ay = normalizeUnixSeconds(y.st ?? y.stm ?? y.startTime) ?? 0
        return ay - ax
      })
      return combined
    },
  })
}

/** loadFaceEvents: `picker` thay cho #face-start-time/#face-end-time, `plateInput` = value của #face-plate-search. */
export async function loadFaceEvents(picker: DatePickerController | null, plateInput: string): Promise<void> {
  useDriverStore.setState({ faceSummary: { kind: 'loading' }, faceGrid: { kind: 'loading' } })

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const begin = picker ? picker.toApiDateTime('start', startOfDay) : ''
  const end = picker ? picker.toApiDateTime('end', now) : ''
  const plate = plateInput.trim().toLowerCase() || ''

  try {
    let faceEventsData = await queryClient.fetchQuery(faceEventsQueryOptions(begin, end))

    if (plate) {
      faceEventsData = faceEventsData.filter((e) => {
        const p = (e.vehiIdno || e.vi || e.nm || e.vehicleName || '').toLowerCase()
        const dev = String(e.devIdno || e.did || '').toLowerCase()
        const dn = String(e.driverName || e.dn || '').toLowerCase()
        return p.includes(plate) || dev.includes(plate) || dn.includes(plate)
      })
    }

    useDriverStore.setState({
      faceSummary: { kind: 'done', total: faceEventsData.length },
      faceGrid: { kind: 'list', events: faceEventsData },
    })
    updateTimestamp()
  } catch (err: Loose) {
    console.error('[driver.js] loadFaceEvents:', err)
    const message = String(err?.message || err)
    useDriverStore.setState({
      faceSummary: { kind: 'error', message },
      faceGrid: { kind: 'error', message: `Lỗi kết nối: ${message}` },
    })
  }
}

export type DriverActivity = {
  alerts30d: number
  hoursMonth: number | null
  alerts: { time: string; type: string; vehicle: string; level: 'high' | 'medium' | 'low' }[]
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Chi tiết tài xế: cảnh báo AI 30 ngày + giờ chạy trong tháng của xe được gán (runMileage.ttime). */
export function driverActivityQueryOptions(vehicle: string) {
  return queryOptions({
    queryKey: ['driver', 'activity', vehicle] as const,
    enabled: !!vehicle && vehicle !== '—',
    queryFn: async (): Promise<DriverActivity> => {
      const now = new Date()
      const since = new Date(now.getTime() - 30 * 86_400_000)
      const [ev, mi] = await Promise.allSettled([
        api.syncAiEventsLocal('', vehicle),
        api.runMileage(vehicle, `${ymd(now).slice(0, 8)}01`, ymd(now)),
      ])
      const evRes: Loose = ev.status === 'fulfilled' ? ev.value : null
      const events: Loose[] = apiResultOk(evRes) && Array.isArray(evRes.events) ? evRes.events : []
      const mine = events
        .filter((e) => String(e.vehiIdno || e.vi || e.vehicleName || '').trim() === vehicle)
        .filter((e) => aiEventTime(e) >= ymd(since))
        .sort((a, b) => aiEventTime(b).localeCompare(aiEventTime(a)))
      const miRes: Loose = mi.status === 'fulfilled' ? mi.value : null
      const rows: Loose[] = apiResultOk(miRes) && Array.isArray(miRes.infos) ? miRes.infos : []
      const secs = rows.reduce((sum, r) => sum + (Number(r.ttime) || 0), 0)
      return {
        alerts30d: mine.length,
        hoursMonth: rows.length ? Math.round(secs / 3600) : null,
        alerts: mine.slice(0, 10).map((e) => ({ ...aiEventToAlert(e), vehicle })),
      }
    },
  })
}
