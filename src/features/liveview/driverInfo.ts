import { useEffect } from 'react'
import { queryOptions } from '@tanstack/react-query'
import { create } from 'zustand'
import { api } from '../../shared/api/endpoints'
import {
  buildDriverInfoFromListRow,
  extractDriverCode,
  formatDriverName,
  formatDt,
  getDurationString,
  type Loose,
} from './lib'
import { getDriverMapping, liveviewKeys } from './queries'
import { useLiveviewStore } from './store'

// Thẻ thông tin tài xế trên video wall (liveview.js:8-13, 104-150, 1238-1668).
// Bản gốc ghi thẳng vào [data-driver-content] của wall; bản port ghi vào useDriverInfoStore theo
// `token` của wall (grid.token), DriverInfoCard render từ đó. "contentEl còn trong document" ⇔ wall
// đó vẫn là grid hiện tại (thẻ còn mount).

/** Nội dung [data-driver-content] (renderDriverInfo). */
export type DriverCardView =
  | { kind: 'message'; text: string }
  /** info = null: "Không có tài xế" (viền đỏ) */
  | { kind: 'none' }
  /** info.isUnknown: "Tài xế không xác định" (vàng) */
  | { kind: 'unknown'; img: string }
  | {
      kind: 'known'
      name: string
      license: string
      avatarSrc: string
      avatarFallback: string
      borderColor: string
      dotColor: string
      dotShadow: string
      /** nội dung span[data-driving-duration]; '' = không có span */
      duration: string
    }

export type DriverCard = { view: DriverCardView; /** mỗi lần renderDriverInfo = innerHTML mới */ rev: number }

type DriverInfoState = {
  cards: Record<number, DriverCard>
  /** _faceCheckPolls: deviceId -> token của wall có interval 10 s */
  faceCheckPolls: Record<string, number>
  /** các interval 10 s đang chạy (theo token của wall). Mỗi poll gắn với wall của nó; stopDriverInfoTimers dừng tất cả */
  runningPolls: Record<number, true>
  /** _drivingDurationTimers: deviceId -> token của wall đang có ticker 1 s */
  drivingDurationTimers: Record<string, number>
}

const INITIAL: DriverInfoState = { cards: {}, faceCheckPolls: {}, runningPolls: {}, drivingDurationTimers: {} }

export const useDriverInfoStore = create<DriverInfoState>(() => ({ ...INITIAL }))

const set = useDriverInfoStore.setState
const get = useDriverInfoStore.getState

type DrivingSession = { driverName: string; startTime: number; lastSeenTime: number }
let drivingSessions: Record<string, DrivingSession> = {} // { deviceId: { driverName, startTime, lastSeenTime } }
const lastDriverIsStranger: Record<string, boolean> = {} // { deviceId: boolean }
/** refreshDriverCard của từng wall (closure có cờ isRefreshing riêng) */
const refreshers = new Map<number, () => Promise<void>>()
let renderSeq = 0

/** `document.body.contains(contentEl)` */
function isWallInDocument(token: number): boolean {
  const g = useLiveviewStore.getState().grid
  return g.kind === 'player' && g.token === token
}

/** Xóa interval 10 s đang nằm ở khóa deviceId (clearInterval(_faceCheckPolls[deviceId]); delete). */
function clearFaceCheckPoll(deviceId: string): void {
  const token = get().faceCheckPolls[deviceId]
  if (token === undefined) return
  set((s) => {
    const faceCheckPolls = { ...s.faceCheckPolls }
    delete faceCheckPolls[deviceId]
    const runningPolls = { ...s.runningPolls }
    delete runningPolls[token]
    return { faceCheckPolls, runningPolls }
  })
}

/** Phần cuối của stopKeepalive (liveview.js:111-125). _lastDriverIsStranger không bị xóa (như bản gốc). */
export function stopDriverInfoTimers(): void {
  // _presencePolls: không nơi nào gán -> luôn rỗng
  // Dừng mọi poll 10 s (kể cả poll có khóa bị ghi đè — bản gốc để lọt, xem MIGRATION_NOTES Task 11)
  set({ faceCheckPolls: {}, runningPolls: {}, drivingDurationTimers: {} })
  // Clear driving sessions
  drivingSessions = {}
}

/** liveview.js:128-132 */
export function stopDrivingDurationTicker(deviceId: string): void {
  if (!deviceId || get().drivingDurationTimers[deviceId] === undefined) return
  set((s) => {
    const drivingDurationTimers = { ...s.drivingDurationTimers }
    delete drivingDurationTimers[deviceId]
    return { drivingDurationTimers }
  })
}

/** tick() của startDrivingDurationTicker (liveview.js:139-150) */
export function tickDrivingDuration(deviceId: string, token: number): void {
  if (!isWallInDocument(token)) {
    stopDrivingDurationTicker(deviceId)
    return
  }
  const session = drivingSessions[deviceId]
  const card = get().cards[token]
  const hasSpan = card !== undefined && card.view.kind === 'known' && card.view.duration !== ''
  if (!session || !hasSpan) {
    stopDrivingDurationTicker(deviceId)
    return
  }
  const text = getDurationString(session.startTime)
  set((s) => {
    const c = s.cards[token]
    if (!c || c.view.kind !== 'known') return s
    return { cards: { ...s.cards, [token]: { ...c, view: { ...c.view, duration: text } } } }
  })
}

/**
 * liveview.js:134-151 — Keeps HH:MM:SS updating every second while session exists (no extra AI calls).
 * setInterval 1 s nằm trong useDrivingDuration (thẻ của wall `token`).
 */
export function startDrivingDurationTicker(deviceId: string, token: number): void {
  stopDrivingDurationTicker(deviceId)
  if (!deviceId) return
  tickDrivingDuration(deviceId, token)
  set((s) => ({ drivingDurationTimers: { ...s.drivingDurationTimers, [deviceId]: token } }))
}

/** Interval 1 000 ms của startDrivingDurationTicker, chạy khi ticker của deviceId thuộc wall này. */
export function useDrivingDuration(deviceId: string, token: number): void {
  const active = useDriverInfoStore((s) => s.drivingDurationTimers[deviceId] === token)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => tickDrivingDuration(deviceId, token), 1000)
    return () => clearInterval(id)
  }, [active, deviceId, token])
}

type DriverInfo = {
  name?: string
  license?: string
  avatar?: string
  isUnknown?: boolean
  isPresent?: boolean
  drivingDuration?: string
  phone?: string
}

/**
 * liveview.js:1238-1380 — info = null → "Không có tài xế" (đỏ); isPresent true → viền xanh; false → đỏ.
 * Ghi vào thẻ của wall `token` (wall đã bị gỡ: không hiển thị ở đâu cả).
 */
export function renderDriverInfo(token: number, info: DriverInfo | null, message = ''): void {
  if (!isWallInDocument(token)) return
  let view: DriverCardView

  if (message) {
    view = { kind: 'message', text: message }
  } else if (!info) {
    // ── Không nhận diện được hoặc chưa có dữ liệu (Hiển thị màu đỏ) ──
    view = { kind: 'none' }
  } else if (info.isUnknown) {
    // ── Unknown Driver (CẢNH BÁO màu vàng) ──
    view = { kind: 'unknown', img: info.avatar || 'https://ui-avatars.com/api/?name=%3F&background=f59e0b&color=fff&size=64' }
  } else {
    // ── Known driver ──
    const driverMapping = getDriverMapping()
    let name = info.name || 'Chưa xác định'
    let license = info.license || '--'

    // Parse để tách Tên và Mã nếu đang bị gộp (ví dụ: "Nguyễn Văn Trường (8899)")
    const nameMatch = name.match(/^(.*?)\s*\((.*)\)$/)
    if (nameMatch) {
      name = nameMatch[1].trim()
      license = nameMatch[2].trim()
    } else {
      // Kiểm tra xem name có phải là ID số không (sau khi đổi tên folder)
      const idMatch = name.trim().match(/^(\d+)$/)
      if (idMatch) {
        license = idMatch[1]
        name = driverMapping[license] || license
      } else if (name.includes('_')) {
        // Xử lý trường hợp cũ hoặc fallback "8899_... "
        const underscoreMatch = name.match(/^(\d+)_+(.*)$/)
        if (underscoreMatch) {
          license = underscoreMatch[1]
          name = underscoreMatch[2].replace(/_/g, ' ').trim()
        } else {
          name = name.replace(/_/g, ' ').trim()
        }
      }
    }

    const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=64`

    // Tải ảnh tài xế theo Mã số (ID) - Dùng BASE_URL động
    let avatarSrc = info.avatar
    if (!avatarSrc || avatarSrc.includes('ui-avatars.com')) {
      // known_faces/ folder thường được đặt tên: `${jobNum}_${safeName}`
      let driverCode = String(license || '')
      const mappedName = driverMapping && driverMapping[driverCode] ? driverMapping[driverCode] : ''
      if (mappedName) {
        const safeName = String(mappedName).replace(/ /g, '_').replace(/\//g, '_')
        driverCode = `${driverCode}_${safeName}`
      }
      avatarSrc = `${api.BASE_URL}driver/photo/${encodeURIComponent(driverCode)}/face_1.jpg`
    }

    const isPresent = info.isPresent
    let borderColor = '#94a3b8'
    let dotColor = '#94a3b8'
    let dotShadow = 'rgba(148,163,184,0.5)'
    if (isPresent === true) {
      borderColor = '#10b981'
      dotColor = '#10b981'
      dotShadow = 'rgba(16,185,129,0.6)'
    } else if (isPresent === false) {
      borderColor = '#ef4444'
      dotColor = '#ef4444'
      dotShadow = 'rgba(239,68,68,0.6)'
    }

    view = {
      kind: 'known',
      name,
      license,
      avatarSrc,
      avatarFallback,
      borderColor,
      dotColor,
      dotShadow,
      duration: info.drivingDuration || '',
    }
  }

  const rev = ++renderSeq
  set((s) => ({ cards: { ...s.cards, [token]: { view, rev } } }))
}

/**
 * liveview.js:1415-1446 — Query the most recent identify alarm for a device (last 10 minutes).
 * Bản gốc không gọi ở đâu (code chết); giữ để đối chiếu.
 */
export async function getLatestIdentifyEvent(
  deviceId: string,
): Promise<{ found: boolean; driverName: string | null; alarm: Loose }> {
  try {
    const end = new Date()
    const start = new Date(end.getTime() - 10 * 60 * 1000)
    const res: Loose = await api.queryIdentifyAlarm(formatDt(start), formatDt(end), deviceId, 1, 5)
    if (res && res.result === 0) {
      const alarms: Loose[] = res.alarms || res.alarmsInfos || res.alarmInfos || []
      if (alarms.length > 0) {
        // Sort newest first
        const sorted = [...alarms].sort((a, b) => (b.st || b.stm || 0) - (a.st || a.stm || 0))
        const latest = sorted[0]
        // Extract driver name from the alarm record
        const driverName = latest.driverName || latest.dn || latest.dName || null
        return { found: true, driverName, alarm: latest }
      }
    }
  } catch (e) {
    console.warn('[LiveView] getLatestIdentifyEvent error:', e)
  }
  return { found: false, driverName: null, alarm: null }
}

/** liveview.js:1448-1475 — Try to find a driver in the full driver list by name. */
export async function findDriverInList(name: string): Promise<Loose> {
  if (!name) return null
  try {
    // 1. Tìm chính xác hoặc phần bù để lấy record có avatar
    const res: Loose = await api.queryDriverList(name)
    if (!res || (res.result !== 0 && res.result !== '0')) return null

    const list: Loose[] = res.infos || res.info || res.data || res.rows || []
    if (list.length === 0) return null

    // Chuẩn hóa chuỗi tìm kiếm để so khớp linh hoạt (thay _ bằng khoảng trắng, viết thường)
    const normalize = (s: unknown) => (s || '').toString().replace(/_/g, ' ').toLowerCase().trim()
    const searchName = normalize(name)

    return (
      list.find((d) => {
        const dbName = normalize(d.dn || d.name || d.driverName)
        // Khớp hoàn toàn hoặc chứa nhau (để xử lý trường hợp ID đi kèm)
        return dbName && (dbName === searchName || dbName.includes(searchName) || searchName.includes(dbName))
      }) || list[0]
    ) // Dự phòng: lấy kết quả đầu tiên nếu API đã lọc đúng
  } catch (e) {
    console.warn('[LiveView] findDriverInList failed:', e)
    return null
  }
}

/** refreshDriverCard (liveview.js:1513-1640) cho wall `token`. */
function createRefreshDriverCard(deviceId: string, token: number, vehiIdno: string): () => Promise<void> {
  let isRefreshing = false
  return async () => {
    if (isRefreshing) return
    isRefreshing = true
    let faceLogPayload: Loose = null
    try {
      let recognizedDriver: string | null = null
      let driverData: DriverInfo | null = null

      // 1. CHỦ ĐỘNG (REAL-TIME AI): Chụp ảnh và nhận diện mỗi 10s (CHN=0)
      try {
        const aiRes: Loose = await api.faceCaptureAndRecognize(deviceId, 0)
        if (aiRes && aiRes.result === 0) {
          // Sử dụng face_count để phân biệt cabin trống và người lạ (Stranger)
          const faceCount =
            typeof aiRes.face_count !== 'undefined' ? aiRes.face_count : aiRes.name !== 'Ignored' ? 1 : 0

          faceLogPayload = {
            devIdno: deviceId,
            vehiIdno: vehiIdno || '',
            name: aiRes.name,
            driverCode: extractDriverCode(aiRes.name),
            match: aiRes.match,
            score: aiRes.score,
            faceCount,
            capturePath: aiRes.capture_path || aiRes.capturePath,
            resultPath: aiRes.result_path || aiRes.resultPath,
            eventTime: new Date().toISOString(),
            elapsedSeconds: aiRes.elapsed_seconds,
            source: 'liveview_poll',
          }

          if (faceCount === 0) {
            // Chắc chắn không có khuôn mặt -> Trạng thái Trống (Màu Đỏ)
            recognizedDriver = null
          } else if (aiRes.match === false || aiRes.name === 'Unknown' || aiRes.name === '0') {
            // Có khuôn mặt nhưng không có trong DB -> Người lạ (Màu Vàng)
            recognizedDriver = 'Stranger'
            let captureUrl = ''
            if (aiRes.captureUrl) captureUrl = `/api/face/capture/${aiRes.captureUrl.replace(/^Face_Capture\//, '')}`
            else if (aiRes.path) captureUrl = `/api/face/capture/${aiRes.path.replace(/^Face_Capture\//, '')}`

            driverData = {
              name: 'Unknown',
              isUnknown: true,
              avatar: captureUrl,
            }
          } else if (aiRes.match === true && aiRes.name) {
            recognizedDriver = aiRes.name
          }
        }
      } catch (aiErr) {
        console.warn('[LiveView] Active AI check failed:', aiErr)
      }

      // ── Xử lý Session & Bộ đếm thời gian ──
      const now = Date.now()
      const existingSession = drivingSessions[deviceId]

      if (recognizedDriver) {
        if (recognizedDriver === 'Stranger') {
          // Strangers don't get a session or counter as per requirements
          lastDriverIsStranger[deviceId] = true
        } else {
          // Known driver session flow
          lastDriverIsStranger[deviceId] = false
          if (existingSession && existingSession.driverName === recognizedDriver) {
            existingSession.lastSeenTime = now
          } else {
            drivingSessions[deviceId] = {
              driverName: recognizedDriver,
              startTime: now,
              lastSeenTime: now,
            }
          }
        }
      } else {
        // No one detected (Empty cabin)
        if (lastDriverIsStranger[deviceId]) {
          // If the previous person was a stranger, clear immediately
          delete drivingSessions[deviceId] // Clear any old stale session
          lastDriverIsStranger[deviceId] = false
        } else if (existingSession) {
          // If the previous person was a known driver, apply 2 min grace period
          const idleTime = now - existingSession.lastSeenTime
          if (idleTime > 120000) {
            delete drivingSessions[deviceId]
          } else {
            recognizedDriver = existingSession.driverName
          }
        }
      }

      // ── Hiển thị kết quả ──
      if (recognizedDriver) {
        const session = drivingSessions[deviceId]
        let info = driverData

        if (recognizedDriver === 'Stranger') {
          if (!info) info = { name: 'Stranger', isUnknown: true }
        } else {
          if (!info) {
            const listRow = await findDriverInList(recognizedDriver)
            if (listRow) {
              info = buildDriverInfoFromListRow(listRow)
            } else {
              info = { name: recognizedDriver, license: '—' }
            }
          }
          info = info as DriverInfo
          info.name = formatDriverName(info.name)
          info.isPresent = true
        }

        info.drivingDuration =
          recognizedDriver === 'Stranger' ? '' : session ? getDurationString(session.startTime) : ''
        renderDriverInfo(token, info)
        if (info.drivingDuration) startDrivingDurationTicker(deviceId, token)
        else stopDrivingDurationTicker(deviceId)
      } else {
        stopDrivingDurationTicker(deviceId)
        renderDriverInfo(token, null) // Render "Không có tài xế" (Red)
      }
    } finally {
      if (faceLogPayload && api.saveFaceRecognitionLog) {
        api.saveFaceRecognitionLog(faceLogPayload).catch((err: Loose) => {
          console.warn('[LiveView] saveFaceRecognitionLog:', err?.message || err)
        })
      }
      isRefreshing = false
    }
  }
}

/**
 * liveview.js:1498-1668. renderUnifiedPlayer gọi trước khi React commit wall: mọi thứ ghi theo token.
 * Lần làm mới đầu chạy trực tiếp; sau đó bật interval 10 s (query trong DriverInfoCard).
 */
export async function loadDriverInfoForWall(deviceId: string, token: number, vehiIdno = ''): Promise<void> {
  // contentEl luôn có (wall vừa dựng)
  // Bỏ refresher/thẻ của các wall cũ (đã gỡ khỏi DOM)
  for (const t of refreshers.keys()) if (t !== token) refreshers.delete(t)
  set((s) => {
    const cards: Record<number, DriverCard> = {}
    if (s.cards[token]) cards[token] = s.cards[token]
    return { cards }
  })

  // Clear any previous polling for this device to prevent stacking (_presencePolls không bao giờ được gán)
  clearFaceCheckPoll(deviceId)
  stopDrivingDurationTicker(deviceId)

  // Rendering helper that encapsulates the full driver-resolution logic
  const refreshDriverCard = createRefreshDriverCard(deviceId, token, vehiIdno)
  refreshers.set(token, refreshDriverCard)

  try {
    stopDrivingDurationTicker(deviceId)
    renderDriverInfo(token, null, 'Đang nhận diện AI...')
    await refreshDriverCard()

    // Poll every 10 s for COMPLETE driver refresh (including AI)
    set((s) => ({
      faceCheckPolls: { ...s.faceCheckPolls, [deviceId]: token },
      runningPolls: { ...s.runningPolls, [token]: true },
    }))
  } catch (e) {
    console.warn('[LiveView] loadDriverInfoForWall failed:', e)
    stopDrivingDurationTicker(deviceId)
    renderDriverInfo(token, null, 'Không tải được thông tin tài xế')
  }
}

/**
 * Interval 10 s của loadDriverInfoForWall (`await refreshDriverCard()`). Dùng trong DriverInfoCard với
 * `enabled = runningPolls[token]`: thẻ unmount (wall bị gỡ) thì dừng, như kiểm tra
 * `document.body.contains(contentEl)` của bản gốc.
 */
export function driverInfoQueryOptions(deviceId: string, token: number) {
  return queryOptions({
    queryKey: [...liveviewKeys.all, 'driverInfo', deviceId, token] as const,
    queryFn: async () => {
      const refresh = refreshers.get(token)
      if (refresh) await refresh()
      return null
    },
    // Lần đầu do loadDriverInfoForWall gọi trực tiếp; query chỉ chạy theo nhịp 10 s.
    initialData: null,
    staleTime: Infinity,
    gcTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  })
}

/** Chỉ dùng trong test. */
export function resetDriverInfo(): void {
  drivingSessions = {}
  for (const k of Object.keys(lastDriverIsStranger)) delete lastDriverIsStranger[k]
  refreshers.clear()
  renderSeq = 0
  set({ ...INITIAL })
}

/** Chỉ dùng trong test. */
export function getDrivingSession(deviceId: string): DrivingSession | undefined {
  return drivingSessions[deviceId]
}
