// Hàm thuần của playback.js (giữ tên gốc, bỏ tiền tố `_`). Phần GPS (1090-1195) dùng ở Task 13.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any

/** playback.js:17 */
export const PAD = (n: number | string): string => String(n).padStart(2, '0')

/** playback.js:19 — Fleetcontrol player parse datetime bằng JS; dùng ISO (`T`) ổn định hơn dấu cách. */
export const toVendorTimeParam = (ymdHms: unknown): string =>
  typeof ymdHms === 'string' ? ymdHms.replace(' ', 'T') : ''

// ─── Format helpers ──────────────────────────────────────────────────────
/** playback.js:22 */
export const formatDt = (iso: string): string => (iso ? iso.replace('T', ' ') + ':00' : '')

/** playback.js:23-24 */
export const localDt = (d: Date = new Date(), end?: boolean): string =>
  `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}T${end ? '23:59' : '00:00'}`

/** playback.js:25-28 */
export const secondsToHms = (s: number): string => {
  const h = (s / 3600) | 0,
    m = ((s % 3600) / 60) | 0
  return h > 0 ? `${h}h ${PAD(m)}p` : `${m}p ${PAD(s % 60)}s`
}

/** playback.js:29-33 */
export const haversineKm = (la1: number, lo1: number, la2: number, lo2: number): number => {
  const R = 6371,
    dLa = ((la2 - la1) * Math.PI) / 180,
    dLo = ((lo2 - lo1) * Math.PI) / 180
  const a =
    Math.sin(dLa / 2) ** 2 + Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLo / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** playback.js:34 */
export const parseTrackTime = (t: Loose): number | null =>
  !t ? null : typeof t === 'number' ? t : new Date(t.replace(' ', 'T')).getTime()

/** playback.js:35 */
export const formatTrackTime = (t: Loose): string => {
  if (!t) return '--'
  const d = new Date(typeof t === 'number' ? t : t.replace(' ', 'T'))
  return `${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`
}

/** playback.js:37-42 — Hiển thị nhật ký: ngày + giờ (đủ rõ khi khoảng tìm kiếm nhiều ngày) */
export const formatTrackDateTime = (t: Loose): string => {
  if (!t) return '--'
  const d = new Date(typeof t === 'number' ? t : String(t).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return '--'
  return `${PAD(d.getDate())}/${PAD(d.getMonth() + 1)}/${d.getFullYear()} ${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`
}

/** playback.js:43 */
export const formatFullDt = (t: Loose): string => {
  if (!t) return ''
  const d = new Date(typeof t === 'number' ? t : t.replace(' ', 'T'))
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())} ${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`
}

/** playback.js:44-48 (bản port render bằng JSX; giữ cho Task 13 nếu cần chuỗi HTML) */
export const escapeHtml = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** playback.js:50-53 — UI dùng 1..4, queryRecVideo thường cần 0..3 */
export const toApiChannelId = (ch: Loose): string => {
  const n = parseInt(ch, 10)
  return Number.isFinite(n) && n >= 1 && n <= 4 ? String(n - 1) : '0'
}

/** playback.js:55-61 — danh sách file có thể là 0..3 hoặc 1..4 tuỳ bản upstream */
export const toUiChannelId = (raw: Loose): string => {
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return '1'
  if (n >= 1 && n <= 4) return String(n)
  if (n >= 0 && n <= 3) return String(n + 1)
  return '1'
}

/** playback.js:63-66 — trang player nhận 0 (tất cả) hoặc 1..4 */
export const toPlayerChannelParam = (ch: Loose): string => {
  const n = parseInt(ch, 10)
  return Number.isFinite(n) && n >= 1 && n <= 4 ? String(n) : '0'
}

/** playback.js:67-76 */
export const getVehicleDeviceId = (vehicle: Loose): string => {
  if (!vehicle || typeof vehicle !== 'object') return ''
  const dl = Array.isArray(vehicle.dl) ? vehicle.dl : []
  for (const d of dl) {
    if (!d || typeof d !== 'object') continue
    const candidate = d.id || d.devIdno || d.DevIDNO || d.did || d.idno
    if (candidate) return String(candidate)
  }
  return String(
    vehicle.devIdno || vehicle.DevIDNO || vehicle.did || vehicle.id || vehicle.vehiIdno || vehicle.nm || '',
  )
}

/** playback.js:77 */
export const isDateTimeString = (t: unknown): t is string =>
  typeof t === 'string' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(t.trim())

/** playback.js:78-81 */
export const toSecNumber = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** playback.js:82-91 */
export const secToDateTime = (baseDateStr: Loose, secValue: unknown): string => {
  const sec = toSecNumber(secValue)
  if (!baseDateStr || sec === null || sec < 0) return ''
  const datePart = String(baseDateStr).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return ''
  const hh = PAD(((sec / 3600) | 0) % 24)
  const mm = PAD(((sec % 3600) / 60) | 0)
  const ss = PAD(sec % 60)
  return `${datePart} ${hh}:${mm}:${ss}`
}

/** playback.js:92-96 */
export const parseYmdHms = (s: unknown): number | null => {
  if (!isDateTimeString(s)) return null
  const t = new Date(s.replace(' ', 'T')).getTime()
  return Number.isFinite(t) ? t : null
}

/** playback.js:97-102 */
export const addSecondsToYmdHms = (s: unknown, sec: number): string => {
  const ts = parseYmdHms(s)
  if (ts === null) return ''
  const d = new Date(ts + sec * 1000)
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())} ${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`
}

/** playback.js:103-112 */
export const normalizeFileTime = (rawValue: unknown, fallbackDateStr: Loose): string => {
  if (isDateTimeString(rawValue)) return rawValue.trim()
  if (typeof rawValue === 'string' && /^\d+$/.test(rawValue.trim())) {
    return secToDateTime(fallbackDateStr, Number(rawValue.trim()))
  }
  if (typeof rawValue === 'number') {
    return secToDateTime(fallbackDateStr, rawValue)
  }
  return ''
}

/** playback.js:117-129 — gắn jsession mới vào URL */
export const injectUpstreamSessionIntoUrl = (url: string, currentJsession: string | null | undefined): string => {
  if (!url || !currentJsession) return url
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://dummy.com' + url)
    const sessionParams = ['jsession', 'sessid', 'userSession', 'sid', 'token']
    let replaced = false
    sessionParams.forEach((p) => {
      if (urlObj.searchParams.has(p)) {
        urlObj.searchParams.set(p, currentJsession)
        replaced = true
      }
    })
    if (!replaced) urlObj.searchParams.set('jsession', currentJsession)
    return url.startsWith('http') ? urlObj.toString() : urlObj.pathname + urlObj.search
  } catch {
    return url
  }
}

/** playback.js:135-148 — chuẩn hoá `begintime/endtime` của player vendor theo khoảng đang tìm */
export const rewriteVendorPlaybackRangeInUrl = (url: string, beginFmt: string, endFmt: string): string => {
  if (!url) return url
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://dummy.com' + url)
    const path = (urlObj.pathname || '').toLowerCase()
    const isVendorPlayer =
      path.includes('playbackvideo.html') || path.includes('playbackvideo') || path.includes('playback')
    if (!isVendorPlayer) return url
    if (beginFmt) urlObj.searchParams.set('begintime', toVendorTimeParam(beginFmt))
    if (endFmt) urlObj.searchParams.set('endtime', toVendorTimeParam(endFmt))
    return url.startsWith('http') ? urlObj.toString() : urlObj.pathname + urlObj.search
  } catch {
    return url
  }
}

/** playback.js:154-185 — trích URL trình phát từ getPlaybackVideoHtml */
export const extractPlaybackHtmlUrl = (res: Loose): string => {
  if (!res) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const isVendorPlayerUrl = (url: unknown): boolean => {
    if (!url || typeof url !== 'string') return false
    const u = url.trim()
    if (!u.startsWith('http')) return false
    if (origin && (u.startsWith(origin) || u.includes('localhost') || u.includes('127.0.0.1'))) return false
    return (
      u.includes('fleetscontrol.com') ||
      u.includes('808gps') ||
      /PlayBackVideo\.html/i.test(u) ||
      /PlaybackVideo\.html/i.test(u) ||
      /videoExampleH5\.html/i.test(u) ||
      /player\//i.test(u)
    )
  }
  if (typeof res === 'string') {
    const m = res.trim().match(/https?:\/\/[^\s"'<>]+/g)
    if (m) {
      const hit = m.find(isVendorPlayerUrl)
      if (hit) return hit
    }
  }
  const candidates = [res.url, res.playbackUrl, res.PlaybackUrl, res.file, res.address, res.playUrl, res.html]
  for (const c of candidates) {
    if (isVendorPlayerUrl(c)) return String(c).trim()
    if (typeof c === 'string' && (c.includes('http://') || c.includes('https://'))) {
      const m = c.match(/https?:\/\/[^\s"'<>]+/g)
      if (m) {
        const hit = m.find(isVendorPlayerUrl)
        if (hit) return hit
      }
    }
  }
  return ''
}

/** playback.js:365-372 */
export const hasAsciiToken = (bytes: Uint8Array, token: string): boolean => {
  const sig = Array.from(token).map((c) => c.charCodeAt(0))
  outer: for (let i = 0; i <= bytes.length - sig.length; i++) {
    for (let j = 0; j < sig.length; j++) if (bytes[i + j] !== sig[j]) continue outer
    return true
  }
  return false
}

// ─── GPS Track (playback.js:1090-1195) ───────────────────────────────────
export const MOVING_SPEED_KMH = 3
export const MIN_PARK_DURATION_SEC = 30 * 60
export const MAX_SEGMENT_GAP_SEC = 15 * 60
export const MAX_TRACK_PAGES = 80
export const MAX_GEO_ENRICH_ROWS = 35
export const GEO_REQUEST_DELAY_MS = 140
export const MAP_COLOR_START = '#10b981'
export const MAP_COLOR_PARK = '#eab308'
export const MAP_COLOR_END = '#ef4444'
export const MAP_COLOR_MOVING = '#FFFFFF'
export const MAP_COLOR_ROUTE = '#2563eb'

export type TrackPoint = { lat: number; lng: number; speed: number; time: Loose; addr: string }

export type ParkStop = {
  startIdx: number
  endIdx: number
  centerIdx: number
  lat: number
  lng: number
  startTime: Loose
  endTime: Loose
  durationSec: number
  addr: string
}

export type JournalEntry = { type: 'start' | 'park' | 'end'; p: Loose; idx: number; stop?: ParkStop }

/** playback.js:1102-1108 */
export const formatDurationSec = (sec: number): string => {
  const s = Math.max(0, Math.round(sec || 0))
  const h = (s / 3600) | 0
  const m = ((s % 3600) / 60) | 0
  if (h > 0) return `${h} giờ ${PAD(m)} phút`
  return `${m} phút`
}

/** playback.js:1110-1151 — phát hiện các đoạn đỗ xe: tốc độ thấp liên tục ≥ 30 phút */
export const detectParkStops = (points: TrackPoint[]): ParkStop[] => {
  if (!points || points.length < 2) return []
  const stops: ParkStop[] = []
  let i = 0
  while (i < points.length) {
    if (points[i].speed > MOVING_SPEED_KMH) {
      i++
      continue
    }
    let j = i + 1
    while (j < points.length) {
      if (points[j].speed > MOVING_SPEED_KMH) break
      const tPrev = parseTrackTime(points[j - 1].time)
      const tCur = parseTrackTime(points[j].time)
      if (tPrev != null && tCur != null && (tCur - tPrev) / 1000 > MAX_SEGMENT_GAP_SEC) break
      j++
    }
    const tStart = parseTrackTime(points[i].time)
    const tEnd = parseTrackTime(points[j - 1].time)
    const durSec = tStart != null && tEnd != null ? Math.max(0, (tEnd - tStart) / 1000) : 0
    if (durSec >= MIN_PARK_DURATION_SEC) {
      let sumLat = 0,
        sumLng = 0,
        n = 0
      for (let k = i; k < j; k++) {
        sumLat += points[k].lat
        sumLng += points[k].lng
        n++
      }
      const centerIdx = i + ((j - i) >> 1)
      stops.push({
        startIdx: i,
        endIdx: j - 1,
        centerIdx,
        lat: sumLat / n,
        lng: sumLng / n,
        startTime: points[i].time,
        endTime: points[j - 1].time,
        durationSec: durSec,
        addr: points[centerIdx]?.addr || '',
      })
    }
    i = j
  }
  return stops
}

/** playback.js:1153-1177 — Nhật ký: bắt đầu → các lần đỗ ≥30p → kết thúc */
export const buildGpsJournalEntries = (points: TrackPoint[], parkStops: ParkStop[] | null | undefined): JournalEntry[] => {
  if (!points.length) return []
  const entries: JournalEntry[] = [{ type: 'start', p: points[0], idx: 0 }]
  ;(parkStops || []).forEach((stop) => {
    entries.push({
      type: 'park',
      idx: stop.centerIdx,
      p: {
        lat: stop.lat,
        lng: stop.lng,
        time: stop.startTime,
        parkEnd: stop.endTime,
        durationSec: stop.durationSec,
        addr: stop.addr,
        speed: 0,
      },
      stop,
    })
  })
  if (points.length > 1) {
    entries.push({ type: 'end', p: points[points.length - 1], idx: points.length - 1 })
  }
  return entries
}

/** playback.js:1179-1183 */
export const extractTrackAddrFromRaw = (p: Loose): string => {
  if (!p || typeof p !== 'object') return ''
  const v =
    p.addr ||
    p.address ||
    p.placeName ||
    p.PlaceName ||
    p.place ||
    p.position ||
    p.ps ||
    p.lp ||
    p.loc ||
    p.location ||
    p.area ||
    p.Adr ||
    ''
  return String(v || '').trim()
}

/** playback.js:1185-1194 */
export const normalizeTrackRow = (p: Loose): TrackPoint => {
  const rawLat = parseFloat(p.lat ?? p.latitude ?? p.gpsLat ?? 0)
  const rawLng = parseFloat(p.lng ?? p.longitude ?? p.gpsLng ?? 0)
  const lat = rawLat > 1000 ? rawLat / 1000000 : rawLat
  const lng = rawLng > 1000 ? rawLng / 1000000 : rawLng
  const speed = parseFloat(p.speed ?? p.gpsSpeed ?? p.sp ?? 0)
  const time = p.gpsTime ?? p.time ?? p.gt ?? p.gps_time ?? null
  const addr = extractTrackAddrFromRaw(p)
  return { lat, lng, speed, time, addr }
}
