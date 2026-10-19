/* eslint-disable @typescript-eslint/no-explicit-any -- dữ liệu thô từ 808gps/backend, giữ duck-typing như driver.js */
import { api } from '../../shared/api/endpoints'
import {
  EVIDENCE_MEDIA_TYPE,
  FACE_EVIDENCE_ALARM_TYPES,
  apiResultOk,
  dedupeFaceEventsMerged,
  dedupeIdentifyRows,
  evidenceItemToFaceEvent,
  extractDevIdFromAny,
  extractDevIdFromVehicle,
  firstPathFromField,
  normalizeUnixSeconds,
  pickCaptureFaceUrl,
  pickEvidenceRows,
  pickIdentifyAlarmRows,
  type Loose,
} from './lib'

/**
 * Closure state của driver.js (vehicleMap, driverDeviceMap, driverMapping, ...) gom thành
 * một object module-level; Task 8 đọc/ghi qua object này.
 */
export const faceState = {
  vehicleMap: {} as Record<string, string>,
  driverDeviceMap: {} as Record<string, string>,
  driverMapping: {} as Record<string, any>,
  isLoadingDriverMapping: false,
  faceServiceOk: false,
}

export function resetFaceState(): void {
  faceState.vehicleMap = {}
  faceState.driverDeviceMap = {}
  faceState.driverMapping = {}
  faceState.isLoadingDriverMapping = false
  faceState.faceServiceOk = false
}

/** Subset của `api` mà fetchIdentifyAlarmsMerged dùng (tham số `a` như bản gốc). */
export type IdentifyApi = Pick<typeof api, 'queryIdentifyAlarm' | 'queryUserVehicle' | 'performanceReportPhotoListSafe'>

// Load mapping jobNum -> name để dựng đúng folder known_faces
export async function loadDriverMapping(): Promise<void> {
  if (faceState.isLoadingDriverMapping) return
  if (faceState.driverMapping && Object.keys(faceState.driverMapping).length > 0) return

  const baseUrl = api && api.BASE_URL
  if (!baseUrl) return

  faceState.isLoadingDriverMapping = true
  try {
    const res = await fetch(`${baseUrl}driver/mapping`, { method: 'GET' })
    if (!res.ok) return
    const data = await res.json()
    if (data && typeof data === 'object') faceState.driverMapping = data
  } catch (e: any) {
    // Mapping không bắt buộc; fallback vẫn dùng d.dn
    console.warn('[driver.js] loadDriverMapping failed:', e.message || e)
  } finally {
    faceState.isLoadingDriverMapping = false
  }
}

// Build a device→plate index from api vehicle list
export const buildVehicleMap = async (): Promise<void> => {
  const vehicleMap = faceState.vehicleMap
  // Try to load from cache first
  const cachedVehicles = localStorage.getItem('vehicles_cache')
  if (cachedVehicles) {
    try {
      const data = JSON.parse(cachedVehicles)
      if (data.vehicles) {
        data.vehicles.forEach((v: Loose) => {
          const devId = extractDevIdFromVehicle(v)
          if (devId) vehicleMap[devId] = v.nm || v.vehiIdno || devId
        })
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const res: Loose = await api.queryUserVehicle()
    if (res && res.vehicles) {
      localStorage.setItem('vehicles_cache', JSON.stringify(res))
      res.vehicles.forEach((v: Loose) => {
        const devId = extractDevIdFromVehicle(v)
        if (devId) vehicleMap[devId] = v.nm || v.vehiIdno || devId
      })
    }
  } catch {
    /* ignore */
  }
}

export const resolveDeviceForDriver = async (driver: Loose): Promise<string> => {
  const key = driver.jn || driver.id || ''
  if (key && faceState.driverDeviceMap[key]) return faceState.driverDeviceMap[key]

  if (driver.jn) {
    const byJn: Loose = await api.findVehicleInfoByDeviceJn(2, driver.jn)
    const infos = byJn?.infos || byJn?.vehicles || byJn?.data || []
    if (Array.isArray(infos) && infos.length > 0) {
      const devId = extractDevIdFromAny(infos[0])
      if (devId) {
        faceState.driverDeviceMap[key] = devId
        return devId
      }
    }
  }

  const localKeys = Object.keys(faceState.vehicleMap)
  if (localKeys.length === 1) return localKeys[0]
  return ''
}

/**
 * Quét toàn bộ danh sách xe để tìm tất cả các xe đang gán tài xế này.
 * Trả về danh sách devIdno.
 */
export const findAllDevicesForDriver = async (driver: Loose): Promise<string[]> => {
  try {
    const res: Loose = await api.queryUserVehicle()
    if (!res || !res.vehicles) return []

    const jobNum = String(driver.jn || '').trim().toLowerCase()
    const driverIdStr = String(driver.id || '').trim().toLowerCase()
    const foundDevIds: string[] = []

    res.vehicles.forEach((v: Loose) => {
      // Kiểm tra cả driverId (di), driverName (dn), và cardNumber (nếu có)
      const v_di = String(v.di || v.driverId || v.driverID || '').trim().toLowerCase()
      const v_dn = String(v.dn || v.driverName || '').trim().toLowerCase()
      const v_job = String(v.jobNum || v.cardNumber || '').trim().toLowerCase()

      // So khớp linh hoạt (loose equal)
      const isMatch =
        (driverIdStr && v_di === driverIdStr) ||
        (jobNum && v_job === jobNum) ||
        (driver.dn && v_dn.includes(String(driver.dn).toLowerCase()))

      if (isMatch) {
        const devId = extractDevIdFromVehicle(v)
        if (devId && !foundDevIds.includes(devId)) {
          foundDevIds.push(devId)
        }
      }
    })
    return foundDevIds
  } catch (err) {
    console.error('[driver.js] findAllDevicesForDriver failed:', err)
    return []
  }
}

/**
 * queryIdentifyAlarm thường không có URL ảnh; querySafetyEvidence / performanceReportPhotoListSafe có file.
 * Gán ảnh từ bản ghi cùng thiết bị + khung thời gian (5 phút) khi thiếu.
 */
export const enrichMissingFaceImagesFromPeers = (events: Loose[]): Loose[] => {
  const capFrom = (e: Loose) => pickCaptureFaceUrl(e) || firstPathFromField(e.armUrl)
  const WINDOW_SEC = 300
  const index = new Map<string, Loose>()
  for (const e of events) {
    const cap = capFrom(e)
    if (!cap) continue
    const dev = String(e.devIdno || e.devId || e.did || '').trim()
    const plate = String(e.vehiIdno || e.vi || '').trim()
    const st = Number(e.st ?? e.stm ?? e.startTime) || 0
    const b = Math.floor(st / WINDOW_SEC)
    for (const k of [`${dev}|${plate}|${b}`, `${dev}||${b}`]) {
      const prev = index.get(k)
      if (!prev || String(capFrom(prev) || '').length < String(cap).length) index.set(k, e)
    }
  }
  return events.map((e) => {
    if (capFrom(e)) return e
    const dev = String(e.devIdno || e.devId || e.did || '').trim()
    const plate = String(e.vehiIdno || e.vi || '').trim()
    const st = Number(e.st ?? e.stm ?? e.startTime) || 0
    const b = Math.floor(st / WINDOW_SEC)
    const peer = index.get(`${dev}|${plate}|${b}`) || index.get(`${dev}||${b}`) || null
    if (!peer) return e
    const peerCap = pickCaptureFaceUrl(peer) || firstPathFromField(peer.armUrl)
    if (!peerCap) return e
    return {
      ...e,
      captureFaceUrl: e.captureFaceUrl || peerCap,
      armUrl: e.armUrl || peer.armUrl || peerCap,
      imageUrl: e.imageUrl || peer.imageUrl,
    }
  })
}

export const enrichIdentifyRowPlate = (evt: Loose): void => {
  const dev = evt.devIdno || evt.DevIDNO || evt.did || extractDevIdFromAny(evt)
  if (dev && faceState.vehicleMap[dev]) {
    if (!evt.vehiIdno && !evt.vi) evt.vehiIdno = faceState.vehicleMap[dev]
  }
}

export type IdentifyAlarmsResult = {
  events: Loose[]
  warnings: string[]
  identifyGlobalMsg: string
  stats: { fromIdentify: number; fromEvidence: number; merged: number }
}

/**
 * Dữ liệu thật từ:
 * - StandardApiAction_queryIdentifyAlarm (808gps — sec-queryIdentifyAlarm)
 * - StandardApiAction_querySafetyEvidence / performanceReportPhotoListSafe — ảnh mã 636, 643 (plans/List_API_linkl.md)
 */
export const fetchIdentifyAlarmsMerged = async (
  a: IdentifyApi,
  begin: string,
  end: string,
): Promise<IdentifyAlarmsResult> => {
  const warnings: string[] = []
  let identifyGlobalMsg = ''

  await buildVehicleMap()

  const pageGlobal = 200
  const pagePerDev = 80
  const batchSize = 8
  const evidenceBatch = 4

  let rows: Loose[] = []
  const globalRes: Loose = await a.queryIdentifyAlarm(begin, end, '', 1, pageGlobal)
  if (apiResultOk(globalRes)) {
    rows = pickIdentifyAlarmRows(globalRes)
  } else if (globalRes && globalRes.msg) {
    identifyGlobalMsg = globalRes.msg
    warnings.push(`queryIdentifyAlarm (toàn hệ thống): ${globalRes.msg}`)
  }

  const vu: Loose = await a.queryUserVehicle()
  const vehicles: Loose[] = (vu && vu.vehicles) || (vu && vu.data) || []

  if (rows.length === 0 && vehicles.length) {
    const devIds = [...new Set(vehicles.map(extractDevIdFromVehicle).filter(Boolean))]
    for (let i = 0; i < devIds.length; i += batchSize) {
      const chunk = devIds.slice(i, i + batchSize)
      const settled = await Promise.allSettled(
        chunk.map((did) => a.queryIdentifyAlarm(begin, end, did, 1, pagePerDev)),
      )
      settled.forEach((s, j) => {
        if (s.status !== 'fulfilled' || !apiResultOk(s.value)) return
        const part = pickIdentifyAlarmRows(s.value)
        const did = chunk[j]
        part.forEach((r) => {
          if (!r.devIdno && !r.DevIDNO && !r.did) r.devIdno = did
        })
        rows.push(...part)
      })
    }
    rows = dedupeIdentifyRows(rows)
  }

  rows.forEach((r) => {
    if (!r.devIdno && r.devId) r.devIdno = String(r.devId)
    enrichIdentifyRowPlate(r)
  })

  const evidenceRows: Loose[] = []
  const vehiList = vehicles
    .map((v) => ({
      vehiIdno: String(v.vehiIdno || v.nm || '').trim(),
      devIdno: extractDevIdFromVehicle(v) || '',
    }))
    .filter((x) => x.vehiIdno || x.devIdno)

  for (let i = 0; i < vehiList.length; i += evidenceBatch) {
    const slice = vehiList.slice(i, i + evidenceBatch)
    const tasks: Promise<void>[] = []
    for (const veh of slice) {
      for (const alarmType of FACE_EVIDENCE_ALARM_TYPES) {
        tasks.push(
          (async () => {
            try {
              const res: Loose = await a.performanceReportPhotoListSafe(
                begin,
                end,
                alarmType,
                EVIDENCE_MEDIA_TYPE,
                veh.vehiIdno,
                veh.devIdno,
              )
              let items = apiResultOk(res) ? pickEvidenceRows(res) : []
              if (items.length === 0 && apiResultOk(res)) {
                const res0: Loose = await a.performanceReportPhotoListSafe(
                  begin,
                  end,
                  alarmType,
                  0,
                  veh.vehiIdno,
                  veh.devIdno,
                )
                if (apiResultOk(res0)) items = pickEvidenceRows(res0)
              } else if (!apiResultOk(res) && res && res.msg && Number(res.result) !== 7) {
                warnings.push(`Evidence ${alarmType} (${veh.vehiIdno || veh.devIdno}): ${res.msg}`)
              }
              items.forEach((it) => {
                evidenceRows.push(evidenceItemToFaceEvent(it, alarmType, veh.vehiIdno, veh.devIdno))
              })
            } catch (err: any) {
              warnings.push(`Evidence ${alarmType}: ${err.message || err}`)
            }
          })(),
        )
      }
    }
    await Promise.all(tasks)
  }

  const merged = dedupeFaceEventsMerged([...rows, ...evidenceRows])
  const withImages = enrichMissingFaceImagesFromPeers(merged)
  withImages.sort((x, y) => {
    const ax = normalizeUnixSeconds(x.st ?? x.stm ?? x.startTime) ?? 0
    const ay = normalizeUnixSeconds(y.st ?? y.stm ?? y.startTime) ?? 0
    return ay - ax
  })

  return {
    events: withImages,
    warnings: [...new Set(warnings)],
    identifyGlobalMsg,
    stats: {
      fromIdentify: rows.length,
      fromEvidence: evidenceRows.length,
      merged: withImages.length,
    },
  }
}

/**
 * Kết quả kiểm tra AI service. Bản gốc ghi thẳng vào #face-service-status / #face-db-count;
 * bản port trả dữ liệu để Task 8 render. Trong lúc chờ, UI hiển thị 'Đang kiểm tra...'.
 */
export type FaceHealthStatus = {
  ok: boolean
  /** Nội dung #face-service-status (không gồm icon) */
  statusText: string
  /** Nội dung #face-db-count */
  dbText: string
}

export const FACE_HEALTH_CHECKING_TEXT = 'Đang kiểm tra...'

// ─── Check AI Service Health ───────────────────────────────────────────────
export const checkFaceServiceHealth = async (): Promise<FaceHealthStatus> => {
  const uvicornHint =
    'Gợi ý: trong Face_recognite_module/face_recognition_core chạy uvicorn face_api_service:app --host 0.0.0.0 --port 5001'
  try {
    const res: Loose = await api.faceHealth()

    if (res && res.status === 'ok') {
      faceState.faceServiceOk = true
      return {
        ok: true,
        statusText: 'AI Service đang chạy',
        dbText: `Database: ${res.known_drivers} tài xế`,
      }
    }

    // FastAPI /health trả 200 nhưng model lỗi (numpy/insightface, v.v.)
    if (res && res.status === 'error') {
      faceState.faceServiceOk = false
      return {
        ok: false,
        statusText: 'AI Service lỗi khi tải model',
        dbText: `${res.detail || 'Không load được recognizer'}. Kiểm tra NumPy 1.x + insightface (xem requirements.txt).`,
      }
    }

    if (res && (res.result === 5 || res.result === '5')) {
      faceState.faceServiceOk = false
      return {
        ok: false,
        statusText: 'Phiên đăng nhập hết hạn',
        dbText: res.msg || 'Đăng nhập lại rồi mở lại trang tài xế.',
      }
    }

    // Backend proxy trả 503 — Python không lắng/nghe 5001 hoặc lỗi mạng
    if (res && (res.result === 99 || res.result === '99')) {
      faceState.faceServiceOk = false
      const net = res.error ? `${res.msg || ''} (${res.error})` : res.msg || 'Face AI Service unavailable'
      return {
        ok: false,
        statusText: 'Không gọi được AI trên cổng 5001',
        dbText: `${net}. ${uvicornHint}`,
      }
    }

    throw new Error(res?.msg || res?.detail || 'Phản hồi health không hợp lệ')
  } catch (err: any) {
    faceState.faceServiceOk = false
    const tail = err?.message ? `${err.message}. ` : ''
    return {
      ok: false,
      statusText: 'AI Service chưa khởi động',
      dbText: `${tail}${uvicornHint}`,
    }
  }
}
