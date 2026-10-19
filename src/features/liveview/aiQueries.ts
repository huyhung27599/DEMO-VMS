import { queryOptions } from '@tanstack/react-query'
import { create } from 'zustand'
import { api } from '../../shared/api/endpoints'
import { mapController } from '../map/mapController'
import {
  AI_ALERT_CRITICAL_ALARM_IDS,
  AI_ALERT_CRITICAL_ARM_TYPES,
  formatDt,
  SAFETY_ALARM_TYPES,
  type Loose,
} from './lib'
import { liveviewKeys } from './queries'
import { useLiveviewStore } from './store'

// Cảnh báo AI (liveview.js:296-490) và tab "Sự kiện AI" (liveview.js:491-985) của window.LiveViewModule.
// Biến module giữ như bản gốc; phần DOM (#ai-events-list, modal) do React render từ useAiEventsStore.

/** Nội dung #ai-events-list. */
export type AiEventsListView =
  /** index.html: "Chưa có sự kiện AI nào được ghi nhận." */
  | { kind: 'initial' }
  /** loadApiAiEvents (không silent): spinner "Đang tải sự kiện AI..." */
  | { kind: 'loading' }
  /** một <li class="ai-event-empty"> chữ thường */
  | { kind: 'empty'; text: string }
  /** "Lỗi tải dữ liệu. Hãy thử lại sau." */
  | { kind: 'error' }
  /** renderAiEvents: các card (đã lọc theo ô tìm kiếm lúc render). `rev` tăng mỗi lần render lại innerHTML */
  | { kind: 'list'; items: Loose[]; rev: number }

/** Nội dung `#ai-thumb-main-${idx}` sau khi timer thumbnail ghi vào (wrap.innerHTML = ...). */
export type AiThumbView =
  | { kind: 'slash' }
  | { kind: 'video'; src: string }
  | { kind: 'evidence'; src: string }
  | { kind: 'capture'; src: string }
  | { kind: 'driverPhoto'; src: string }
  | { kind: 'viewfinder' }

export type AiModalView = {
  /** mỗi lần mở là một overlay mới (bản gốc: insertAdjacentHTML) */
  id: number
  ev: Loose
  /** overlay còn class `active` (closeAiEventModal gỡ class rồi 300 ms sau mới xóa) */
  active: boolean
  /** #modal-main-img src và #modal-img-counter (navModalImg ghi) */
  imgSrc: string
  counterText: string
}

type AiEventsState = {
  /** giá trị #ai-event-search */
  search: string
  list: AiEventsListView
  thumbs: Record<number, AiThumbView>
  /** _aiEventsPollTimer đã được tạo (startAiEventsPolling) */
  pollingStarted: boolean
  /** aiAlertsPollTimer đã được tạo (startAiAlertPolling) */
  alertPollingStarted: boolean
  modal: AiModalView | null
}

const INITIAL: AiEventsState = {
  search: '',
  list: { kind: 'initial' },
  thumbs: {},
  pollingStarted: false,
  alertPollingStarted: false,
  modal: null,
}

export const useAiEventsStore = create<AiEventsState>(() => ({ ...INITIAL }))

const set = useAiEventsStore.setState
const get = useAiEventsStore.getState

let aiEventsCache: Loose[] = []
let aiAlertsCache: Loose[] = []
let aiAlertsAckTime = 0 // “Xóa tất cả” => tạm ghi nhận tới thời điểm này
let renderRev = 0

/** Biến `vehiclesCache` và giá trị #liveview-vehicle-select của liveview. */
function liveviewVehicles(): { vehiclesCache: Loose[]; selectValue: string } {
  const s = useLiveviewStore.getState()
  return { vehiclesCache: s.vehiclesCache, selectValue: s.vehicleValue }
}

function baseUrlWithoutApi(): string {
  return api.BASE_URL.replace(/\/api\/$/, '')
}

// ─── Cảnh báo AI (dropdown) ───────────────────────────────────────────────
// index.html không có #ai-alert-list / #ai-badge / #clear-ai-btn nên pollAiAlerts luôn thoát sớm
// (không gọi API) — giữ nguyên. Phần render dưới đây chỉ chạy nếu phần tử đó tồn tại.

/** liveview.js:306-308 */
export function getAiAlertListEl(): HTMLElement | null {
  return document.getElementById('ai-alert-list')
}

function alertLine(text: string, muted: boolean): HTMLDivElement {
  const div = document.createElement('div')
  div.style.cssText = `${muted ? 'font-size:0.78rem; color:var(--color-text-muted);' : 'font-weight:600; font-size:0.86rem;'} white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`
  div.textContent = text
  return div
}

/** liveview.js:310-363 (innerHTML -> dựng node bằng DOM API, cùng nội dung) */
export function renderAiAlertsDropdown(): void {
  const list = getAiAlertListEl()
  if (!list) return

  if (!aiAlertsCache.length) {
    const li = document.createElement('li')
    li.className = 'ai-empty'
    li.textContent = 'Không có cảnh báo AI mới'
    list.replaceChildren(li)
    return
  }

  // Hiển thị tối đa 20 cảnh báo mới nhất
  const items = aiAlertsCache.slice(0, 20)
  list.replaceChildren(
    ...items.map((ev) => {
      const _raw = ev.stm || 0
      const epochMs = _raw > 10000000000 ? _raw : _raw * 1000
      const timeStr = epochMs ? new Date(epochMs).toLocaleTimeString('vi-VN') : '--:--'
      const typeName = ev.typeName || SAFETY_ALARM_TYPES[String(ev.armType)] || 'Cảnh báo ' + ev.armType
      const plate = ev.vehicleName || ev.vehiIdno || ev.devId || 'N/A'

      const li = document.createElement('li')
      li.className = 'ai-alert-item'
      li.style.cssText = 'padding:0.65rem 1rem; border-bottom:1px solid var(--color-border); cursor:pointer;'
      const row = document.createElement('div')
      row.style.cssText = 'display:flex; gap:10px; align-items:flex-start;'
      const dot = document.createElement('div')
      dot.style.cssText =
        'width:10px; height:10px; margin-top:5px; border-radius:50%; background: var(--color-danger); flex-shrink:0;'
      const body = document.createElement('div')
      body.style.cssText = 'min-width:0;'
      body.append(alertLine(String(typeName), false), alertLine(String(plate), true), alertLine(timeStr, true))
      row.append(dot, body)
      li.append(row)

      // Bind click cho items
      li.addEventListener('click', () => {
        // Lấy theo vehicleName để lọc list AI ở tab “Sự kiện AI”
        if (ev && ev.vehicleName) {
          set({ search: String(ev.vehicleName) })
          // đảm bảo filter chạy
          li.dispatchEvent(new Event('ai-alert-open'))
          // gọi trực tiếp để render ngay nếu tab đang mở
          if (useLiveviewStore.getState().rightTab === 'ai-events') {
            void loadApiAiEvents().then(() => {
              // restore search to filter (searchInput.dispatchEvent(new Event('input')))
              onAiSearchInput(get().search)
            })
          }
        }
      })
      return li
    }),
  )
}

/** liveview.js:365-371 */
export function updateAiAlertBadge(): void {
  const badge = document.getElementById('ai-badge')
  if (!badge) return
  const count = aiAlertsCache.length
  badge.textContent = String(count)
  badge.style.display = count > 0 ? 'flex' : 'none'
}

/** liveview.js:373-378 — listener của #clear-ai-btn (không có trong index.html) */
export function clearAiAlerts(): void {
  aiAlertsAckTime = Date.now() // Acknowledge until now
  aiAlertsCache = []
  renderAiAlertsDropdown()
  updateAiAlertBadge()
}

/**
 * liveview.js:380-385 — init() gọi một lần. Bản port: bật query `aiAlertsQueryOptions` (mount trong
 * LiveviewSection) — query fetch ngay khi bật (= lời gọi pollAiAlerts() ngay) rồi mỗi 15 s.
 */
export function startAiAlertPolling(): void {
  if (get().alertPollingStarted) return
  set({ alertPollingStarted: true })
}

/** liveview.js:387-489 */
export async function pollAiAlerts(): Promise<void> {
  const list = getAiAlertListEl()
  if (!list) return // không có UI => không poll

  const { vehiclesCache, selectValue } = liveviewVehicles()
  if (!vehiclesCache || vehiclesCache.length === 0) return

  let targetVehicles: Loose[]
  if (selectValue !== '') {
    targetVehicles = [vehiclesCache[parseInt(selectValue)]]
  } else {
    targetVehicles = vehiclesCache.slice(0, 5)
  }

  targetVehicles = targetVehicles.filter(Boolean)
  if (!targetVehicles.length) return

  // Cửa sổ thời gian để “cảnh báo gần nhất”
  const end = new Date()
  const start = new Date(end.getTime() - 10 * 60 * 1000)

  try {
    const promises = targetVehicles.flatMap((v) => {
      const devId = v.dl && v.dl.length > 0 ? v.dl[0].id : v.id || ''
      const vehiIdno = v.vehiIdno || v.nm || ''
      if (!devId) return []

      const safetyPromise = api
        .querySafetyAlarm(formatDt(start), formatDt(end), AI_ALERT_CRITICAL_ALARM_IDS, devId, 1, 50)
        .then((data: Loose) => {
          const alarms: Loose[] = data?.result === 0 ? data.alarms || data.alarmsInfos || [] : []
          return alarms.map((a) => ({
            ...a,
            vehicleName: v.nm || vehiIdno || devId,
            vehiIdno: vehiIdno,
            devId: devId,
            stm: a.st || a.stm || a.startTime,
            armType: a.ty || a.armType || a.alarmType,
            typeName:
              SAFETY_ALARM_TYPES[String(a.ty || a.armType || a.alarmType)] ||
              'Cảnh báo ' + (a.ty || a.armType || a.alarmType),
          }))
        })
        .catch(() => [])

      const identifyPromise = api
        .queryIdentifyAlarm(formatDt(start), formatDt(end), devId)
        .then((data: Loose) => {
          const alarms: Loose[] = data?.result === 0 ? data.alarms || data.alarmsInfos || data.alarmInfos || [] : []
          return alarms.map((a) => ({
            ...a,
            vehicleName: v.nm || vehiIdno || devId,
            vehiIdno: vehiIdno,
            devId: devId,
            stm: a.st || a.stm || a.startTime,
            armType: a.ty || a.armType || a.alarmType || 643, // "Sự kiện nhận dạng tài xế"
            typeName: `Nhận dạng: ${a.driverName || 'Tài xế mới'}`,
          }))
        })
        .catch(() => [])

      return [safetyPromise, identifyPromise]
    })

    const results = await Promise.all(promises)
    const merged: Loose[] = results.flat()

    // Dedupe & filter bởi thời điểm ack (nút “Xóa tất cả”)
    const ackMs = aiAlertsAckTime || 0
    const dedupeKey = (a: Loose) =>
      [a.guid || '', a.devId || '', a.armType || a.ty || '', a.stm || a.st || a.startTime || ''].join('|')
    const unique = new Map<string, Loose>()
    merged.forEach((a) => {
      const _raw = a.stm || 0
      const alarmMs = _raw > 10000000000 ? _raw : _raw * 1000
      if (ackMs && alarmMs && alarmMs <= ackMs) return
      const key = dedupeKey(a)
      if (!unique.has(key)) unique.set(key, a)
    })

    const fresh = Array.from(unique.values())
      .filter((a) => AI_ALERT_CRITICAL_ARM_TYPES.map(String).includes(String(a.armType)))
      .sort((x, y) => (y.stm || 0) - (x.stm || 0))

    aiAlertsCache = fresh
    renderAiAlertsDropdown()
    updateAiAlertBadge()
  } catch (e) {
    console.warn('[AI Alerts] poll failed:', e)
  }
}

/** setInterval(pollAiAlerts, 15_000) + lời gọi ngay của startAiAlertPolling. */
export function aiAlertsQueryOptions() {
  return queryOptions({
    queryKey: [...liveviewKeys.all, 'aiAlerts'] as const,
    queryFn: async () => {
      await pollAiAlerts()
      return null
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  })
}

// ─── AI Events Tab: Real-time polling ─────────────────────────────────────

/**
 * liveview.js:491-498 — guard "already running". Bản port bật query `aiEventsQueryOptions`
 * (mount trong AiEventsPanel, chỉ enabled khi tab 'ai-events' đang active).
 */
export function startAiEventsPolling(): void {
  if (get().pollingStarted) return // already running
  set({ pollingStarted: true })
}

/** setInterval 3000 ms: loadApiAiEvents(silent = true) khi #rtab-ai-events đang active. */
export function aiEventsQueryOptions() {
  return queryOptions({
    queryKey: [...liveviewKeys.all, 'aiEvents'] as const,
    queryFn: async () => {
      await loadApiAiEvents(/* silent = */ true)
      return null
    },
    // Lần tải đầu (không silent) do click tab gọi trực tiếp; query chỉ chạy theo nhịp 3 s.
    initialData: null,
    staleTime: Infinity,
    refetchInterval: 3000, // Tăng lên 3s để tránh lag và lặp lại liên tục
    refetchIntervalInBackground: true,
  })
}

/** liveview.js:500-636 */
export async function loadApiAiEvents(silent = false, force = false): Promise<void> {
  // #ai-events-list luôn tồn tại (AiEventsPanel luôn mount)
  if (!silent) {
    set({ list: { kind: 'loading' } })
  }

  // Ưu tiên xe đang chọn, fallback 5 xe đầu
  const { vehiclesCache, selectValue } = liveviewVehicles()
  let targetVehicles: Loose[] = []
  if (selectValue !== '') {
    const v = vehiclesCache[parseInt(selectValue)]
    if (v) targetVehicles = [v]
  }
  if (targetVehicles.length === 0) {
    targetVehicles = vehiclesCache.slice(0, 5)
  }

  if (!targetVehicles.length) {
    set({ list: { kind: 'empty', text: 'Chưa có phương tiện. Hãy chọn xe từ danh sách trên.' } })
    return
  }

  try {
    const end = new Date()
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000) // 24h qua

    // ── Fetch safety alarms + identify alarms in parallel per vehicle ──
    const allPromises = targetVehicles.flatMap((v) => {
      if (!v) return []
      const devId = v.dl && v.dl.length > 0 ? v.dl[0].id : v.id || ''
      const vehiIdno = v.vehiIdno || v.nm || ''

      // 1) Lấy sự kiện AI từ Database Sync nội bộ
      const safetyP = api
        .syncAiEventsLocal(devId, vehiIdno)
        .then((data: Loose) => {
          const items: Loose[] = data?.result === 0 ? data.events || [] : []
          return items.map((a) => ({
            _type: 'safety',
            vehicleName: v.nm || vehiIdno || devId,
            vehiIdno: a.vehiIdno,
            devId: a.devIdno || devId,
            stmStr: new Date(a.fileTime).toLocaleString('sv-SE').replace('T', ' '),
            timeMs: new Date(a.fileTime).getTime(),
            armType: String(a.alarmType || ''),
            typeName: a.typeName || SAFETY_ALARM_TYPES[String(a.alarmType)] || 'Cảnh báo ' + a.alarmType,
            images: a.images || [],
            currentImgIdx: 0,
            position: a.position || '',
            blat: a.blat ? a.blat * 1000000 : 0, // Trả lại chuẩn để tương thích UI cũ
            blng: a.blng ? a.blng * 1000000 : 0,
            _raw: a,
          }))
        })
        .catch(() => [])

      // 2) Giữ nguyên sự kiện nhận dạng tài xế (nếu cần)
      const identifyP = api
        .queryIdentifyAlarm(formatDt(start), formatDt(end), devId, 1, 20)
        .then((data: Loose) => {
          const alarms: Loose[] = data?.result === 0 ? data.alarms || data.alarmsInfos || data.alarmInfos || [] : []
          return alarms.map((a) => {
            const raw = a.st || a.stm || a.startTime || 0
            const ms = raw > 10000000000 ? raw : raw * 1000
            return {
              _type: 'identify',
              vehicleName: v.nm || vehiIdno || devId,
              vehiIdno,
              devId,
              timeMs: ms,
              stmStr: new Date(ms).toLocaleString('sv-SE').replace('T', ' '),
              armType: String(a.ty || a.armType || a.alarmType || '643'),
              typeName: a.driverName ? `Nhận dạng: ${a.driverName}` : 'Sự kiện nhận dạng tài xế',
              driverName: a.driverName || a.dn || null,
              captureImg: a.img || a.imgUrl || a.path || null,
              guid: a.guid || '',
              _raw: a,
            }
          })
        })
        .catch(() => [])

      return [safetyP, identifyP]
    })

    const results = await Promise.all(allPromises)
    const rawMerged: Loose[] = results.flat()

    // Lọc trùng lặp vì API sync trả về 20 item global cho mỗi xe
    const seen = new Set<string>()
    const finalItems: Loose[] = []

    rawMerged.forEach((item) => {
      if (item._type === 'safety') {
        const key = `${item.vehiIdno}_${item.timeMs}_${item.armType}`
        if (!seen.has(key)) {
          seen.add(key)
          finalItems.push(item)
        }
      } else {
        const key = item.guid || `${item.devId}_${item.timeMs}_${item.armType}`
        if (!seen.has(key)) {
          seen.add(key)
          finalItems.push({ ...item, images: [], currentImgIdx: 0 })
        }
      }
    })

    // Sort newest first
    finalItems.sort((a, b) => b.timeMs - a.timeMs)

    // Chỉ lấy 20 sự kiện gần nhất theo yêu cầu mới
    const newTop20 = finalItems.slice(0, 20)

    // Cơ chế kiểm tra thay đổi (Change Detection) để tránh load lặp lại
    const oldSignature = aiEventsCache.map((e) => `${e.vehiIdno}_${e.timeMs}_${e.armType}`).join('|')
    const newSignature = newTop20.map((e) => `${e.vehiIdno}_${e.timeMs}_${e.armType}`).join('|')

    const shouldUpdate = newSignature !== oldSignature || force
    if (shouldUpdate) {
      console.log('[AI Events] Data updated or forced, re-rendering cards...')
      aiEventsCache = newTop20
    }

    // Luôn render khi mở tab (silent=false), còn polling silent=true thì chỉ render khi shouldUpdate.
    if (!silent || shouldUpdate) {
      renderAiEvents()
    }

    // Start polling if not already running
    startAiEventsPolling()
  } catch (err) {
    console.error('[AI Events]', err)
    if (!silent) {
      set({ list: { kind: 'error' } })
    }
  }
}

/** Phần tử `#ai-thumb-main-${idx}` còn trong #ai-events-list (document.getElementById). */
function thumbExists(idx: number): boolean {
  const list = get().list
  return list.kind === 'list' && idx < list.items.length
}

function setThumb(idx: number, view: AiThumbView): void {
  set((s) => ({ thumbs: { ...s.thumbs, [idx]: view } }))
}

/** liveview.js:638-784 (window.renderAiEvents) */
export function renderAiEvents(): void {
  const searchTerm = get().search.toLowerCase().trim()

  const filtered = aiEventsCache.filter((ev) => {
    if (!searchTerm) return true
    return (
      (ev.vehicleName && String(ev.vehicleName).toLowerCase().includes(searchTerm)) ||
      (ev.typeName && String(ev.typeName).toLowerCase().includes(searchTerm)) ||
      (ev.driverName && String(ev.driverName).toLowerCase().includes(searchTerm))
    )
  })

  if (filtered.length === 0) {
    set({
      list: {
        kind: 'empty',
        text: searchTerm ? 'Không có sự kiện khớp tìm kiếm.' : 'Không có sự kiện AI nào trong 24h qua.',
      },
    })
    return
  }

  filtered.forEach((ev, idx) => {
    const isIdentify = ev._type === 'identify'
    const isUnknown =
      isIdentify && (!ev.driverName || ev.driverName.toLowerCase().includes('unknown') || ev.driverName === '0')

    // Stagger thumbnail loads: only load for safety alarms IF not already have images
    if (!isIdentify && (!ev.images || ev.images.length === 0)) {
      setTimeout(() => void loadAiEventThumbnail(ev, idx), idx * 250)
    } else if (isIdentify) {
      // Đối với sự kiện nhận dạng: Tải ảnh hồ sơ (nếu biết) hoặc ảnh chụp (nếu là Unknown)
      setTimeout(() => {
        if (!thumbExists(idx)) return

        if (isUnknown && ev.captureImg) {
          const filename = ev.captureImg.split(/[/\\]/).pop()
          setThumb(idx, { kind: 'capture', src: api.BASE_URL + 'face/capture/' + filename })
        } else if (ev.driverName) {
          const match = ev.driverName.match(/\((.*?)\)/) || ev.driverName.match(/^(\d+)/)
          const driverCode = match ? match[1] : ev.driverName.trim()
          setThumb(idx, { kind: 'driverPhoto', src: `${api.BASE_URL}driver/photo/${driverCode}/face_1.jpg` })
        } else {
          setThumb(idx, { kind: 'viewfinder' })
        }
      }, 50)
    }
    // Images already there from syncAiEventsLocal (backend downloaded): thumbHtml đã có ảnh
  })
  // list.innerHTML = html: card mới, thumbnail về trạng thái ban đầu
  set({ list: { kind: 'list', items: filtered, rev: ++renderRev }, thumbs: {} })
}

/** liveview.js:924-976 */
export async function loadAiEventThumbnail(ev: Loose, idx: number): Promise<void> {
  const list = get().list
  if (list.kind !== 'list' || idx >= list.items.length) return
  const wrapRev = list.rev // wrap = phần tử của lần render này

  const writeWrap = (view: AiThumbView) => {
    const cur = get().list
    if (cur.kind === 'list' && cur.rev === wrapRev) setThumb(idx, view)
  }

  const _raw = ev.stm || 0
  const epochMs = _raw > 10000000000 ? _raw : _raw * 1000
  if (!epochMs) {
    writeWrap({ kind: 'slash' })
    return
  }

  try {
    const tstart = new Date(epochMs - 90_000) // -90s
    const tend = new Date(epochMs + 90_000) // +90s
    const fmt = (dt: Date) => dt.toISOString().split('T')[0] + ' ' + dt.toTimeString().split(' ')[0]

    // querySafetyEvidence — accepts vehiIdno (biển số) per API doc
    const res: Loose = await api.performanceReportPhotoListSafe(
      fmt(tstart),
      fmt(tend),
      ev.armType,
      '0', // mediaType: 0 = ảnh vi phạm
      ev.vehiIdno || ev.vehicleName || '',
    )

    // API may return: { photos:[...] } or { medias:[...] } or { infos:[...] }
    const items: Loose[] =
      res?.result === 0 ? res.photos || res.medias || res.infos || res.media || res.alarmInfolist || [] : []

    if (items.length > 0) {
      // Prefer image over video
      const mediaItem =
        items.find((p) => {
          const f = p.file || p.url || p.imgUrl || p.path || ''
          return f && !f.endsWith('.mp4') && !f.endsWith('.avi')
        }) || items[0]

      const mediaUrl = mediaItem.file || mediaItem.url || mediaItem.imgUrl || mediaItem.path || ''
      if (mediaUrl) {
        if (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.avi')) {
          writeWrap({ kind: 'video', src: mediaUrl })
        } else {
          writeWrap({ kind: 'evidence', src: mediaUrl })
        }
        return
      }
    }
    writeWrap({ kind: 'slash' })
  } catch {
    // const w = document.getElementById(wrapId): phần tử hiện tại (có thể của lần render sau)
    if (thumbExists(idx)) setThumb(idx, { kind: 'slash' })
  }
}

// ─── Listener của #ai-event-search / #refresh-ai-events (initRightPanelTabs) ───

/** input #ai-event-search: listener chỉ gắn sau init(); giá trị ô vẫn đổi trước đó. */
export function onAiSearchInput(value: string): void {
  set({ search: value })
  if (!useLiveviewStore.getState().initialized) return
  renderAiEvents() // filter existing cache
}

/** click #refresh-ai-events */
export function onRefreshAiEventsClick(): void {
  if (!useLiveviewStore.getState().initialized) return
  // Force reload manually: clear old signature or pass flag
  void loadApiAiEvents(/* silent = */ false, /* force = */ true)
}

// --- AI Event Modal Logic (liveview.js:788-922) ---
let currentModalIdx = -1
let currentModalImgIdx = 0
let modalSeq = 0

/** liveview.js:886-891 */
export function getModalImageUrl(imgIdx: number): string {
  const ev = aiEventsCache[currentModalIdx]
  if (!ev || !ev.images || !ev.images[imgIdx]) return ''
  const path = ev.images[imgIdx]
  return path.startsWith('http') ? path : baseUrlWithoutApi() + path
}

/**
 * window.openAiEventModal(idx) — onclick của card. `idx` là chỉ số trong danh sách ĐÃ LỌC nhưng
 * được tra trong aiEventsCache (chưa lọc) như bản gốc.
 */
export function openAiEventModal(idx: number): void {
  const ev = aiEventsCache[idx]
  if (!ev) return

  currentModalIdx = idx
  currentModalImgIdx = 0

  // Focus on map first (if location exists)
  const lat = ev.blat ? ev.blat / 1000000 : 0
  const lng = ev.blng ? ev.blng / 1000000 : 0
  if (lat) {
    mapController.focusOnLocation(lat, lng)
  }

  // Remove old modal if exists -> overlay mới
  set({
    modal: {
      id: ++modalSeq,
      ev,
      active: true,
      imgSrc: getModalImageUrl(0),
      counterText: `1 / ${ev.images ? ev.images.length : 0}`,
    },
  })
  document.body.style.overflow = 'hidden' // Prevent scroll body

  // Listen Esc key
  document.addEventListener('keydown', onEscModal)
}

/** window.navModalImg */
export function navModalImg(dir: number): void {
  const ev = aiEventsCache[currentModalIdx]
  if (!ev || !ev.images || ev.images.length <= 1) return

  currentModalImgIdx += dir
  if (currentModalImgIdx < 0) currentModalImgIdx = ev.images.length - 1
  if (currentModalImgIdx >= ev.images.length) currentModalImgIdx = 0

  const modal = get().modal
  if (modal) {
    set({
      modal: { ...modal, imgSrc: getModalImageUrl(currentModalImgIdx), counterText: `${currentModalImgIdx + 1} / ${ev.images.length}` },
    })
  }
}

/** window.closeAiEventModal */
export function closeAiEventModal(): void {
  const overlay = get().modal
  if (overlay) {
    set({ modal: { ...overlay, active: false } })
    setTimeout(() => {
      // overlay.remove(): chỉ xóa đúng overlay này (overlay mở sau đó vẫn giữ)
      const cur = get().modal
      if (cur && cur.id === overlay.id) set({ modal: null })
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onEscModal)
    }, 300)
  }
}

function onEscModal(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeAiEventModal()
}

/** Chỉ dùng trong test. */
export function resetAiState(): void {
  aiEventsCache = []
  aiAlertsCache = []
  aiAlertsAckTime = 0
  renderRev = 0
  currentModalIdx = -1
  currentModalImgIdx = 0
  modalSeq = 0
  document.removeEventListener('keydown', onEscModal)
  document.body.style.overflow = ''
  set({ ...INITIAL })
}
