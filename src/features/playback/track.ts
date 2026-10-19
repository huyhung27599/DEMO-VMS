import { api } from '../../shared/api/endpoints'
import { enrichTimelinePlaces, nextTimelinePlaceSeq } from './geocode'
import {
  buildGpsJournalEntries,
  detectParkStops,
  formatFullDt,
  haversineKm,
  MAX_SEGMENT_GAP_SEC,
  MAX_TRACK_PAGES,
  MOVING_SPEED_KMH,
  normalizeTrackRow,
  parseTrackTime,
  secondsToHms,
  type JournalEntry,
  type Loose,
  type TrackPoint,
} from './lib'
import { usePlaybackStore, type TrackStats } from './store'
import { clearTrack, focusMapOnJournalEntry, renderTrackOnMap, setTrackPoints } from './trackMapController'
import { findFileMetaForTime, setTrackStatus, showPlaybackIframe } from './videoController'

// Hành trình GPS của window.PlaybackModule (playback.js:1196-1384, 1658-1767).
// #pb-timeline-body / #pb-timeline-count / #pb-stat-* → usePlaybackStore (timeline, timelineCount, stats).

const set = usePlaybackStore.setState
const get = usePlaybackStore.getState

/** playback.js:1196-1215 — gom các trang queryTrackDetail (500 dòng/trang, tối đa MAX_TRACK_PAGES). */
export async function fetchAllTrackRows(
  devId: string,
  beginFmt: string,
  endFmt: string,
): Promise<{ rows: Loose[]; mayHaveMore: boolean }> {
  const pageSize = 500
  let page = 1
  const acc: Loose[] = []
  let lastBatchLen = 0
  while (page <= MAX_TRACK_PAGES) {
    const res = await api.queryTrackDetail(devId, beginFmt, endFmt, page, pageSize)
    if (!res || res.result !== 0) {
      if (page === 1) throw new Error(res?.msg || 'queryTrackDetail failed')
      break
    }
    const batch = res.tracks || res.positions || res.datas || res.data || []
    if (!Array.isArray(batch) || !batch.length) break
    acc.push(...batch)
    lastBatchLen = batch.length
    if (batch.length < pageSize) break
    page++
  }
  const mayHaveMore = lastBatchLen >= pageSize && page > MAX_TRACK_PAGES
  return { rows: acc, mayHaveMore }
}

/** playback.js:1267-1384 — onSearch `await` hàm này sau khi dựng trình phát. */
export async function loadGpsTrack(devId: string, beginFmt: string, endFmt: string): Promise<void> {
  setTrackStatus('Đang tải...', false)
  clearTrack()
  const seq = nextTimelinePlaceSeq()
  try {
    const { rows: rawRows, mayHaveMore } = await fetchAllTrackRows(devId, beginFmt, endFmt)
    const points = rawRows.map(normalizeTrackRow).filter((p) => p.lat !== 0 && p.lng !== 0)
    points.sort((a, b) => (parseTrackTime(a.time) || 0) - (parseTrackTime(b.time) || 0))

    if (!points.length) {
      setTrackStatus('Không có dữ liệu GPS', false)
      renderTimelineEmpty()
      return
    }

    // Phát hiện đỗ xe trên dữ liệu đầy đủ (trước khi lọc — lọc drift hay xóa mất điểm đứng → mất chấm vàng)
    const parkStops = detectParkStops(points)

    // --- BỘ LỌC CHỐNG NHIỄU GPS (chỉ áp dụng cho đường polyline + phát lại) ---
    const filteredPoints: TrackPoint[] = []
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        filteredPoints.push(points[i])
        continue
      }
      const prev = filteredPoints[filteredPoints.length - 1]
      const curr = points[i]

      const distanceKm = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng)
      const timeDiffSec = ((parseTrackTime(curr.time) || 0) - (parseTrackTime(prev.time) || 0)) / 1000

      if (timeDiffSec <= 0) continue

      const speedKmh = (distanceKm / timeDiffSec) * 3600

      if (speedKmh > 100) continue

      if ((curr.speed || 0) < MOVING_SPEED_KMH) {
        if (speedKmh > 10) continue
        if (distanceKm < 0.03) continue
      } else if (distanceKm < 0.01) {
        continue
      }

      filteredPoints.push(curr)
    }

    // --- BỘ LỌC GAI (SPIKE REMOVAL) ĐỂ OSRM KHÔNG BỊ VÒNG VÈO ---
    const despikedPoints: TrackPoint[] = []
    for (let i = 0; i < filteredPoints.length; i++) {
      if (i === 0 || i === filteredPoints.length - 1) {
        despikedPoints.push(filteredPoints[i])
        continue
      }
      const prev = despikedPoints[despikedPoints.length - 1]
      const curr = filteredPoints[i]
      const next = filteredPoints[i + 1]

      const d1 = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng)
      const d2 = haversineKm(curr.lat, curr.lng, next.lat, next.lng)
      const d3 = haversineKm(prev.lat, prev.lng, next.lat, next.lng)

      // Nếu đi vòng vèo hoặc nhảy xa bất thường (d3 ngắn hơn d1+d2 rất nhiều)
      if (d1 > 0.02 && d2 > 0.02 && d3 < (d1 + d2) * 0.3) {
        continue
      }
      despikedPoints.push(curr)
    }

    const displayPoints = despikedPoints.length >= 2 ? despikedPoints : points

    setTrackPoints(displayPoints)
    const journalEntries = buildGpsJournalEntries(points, parkStops)
    // bản gốc không await (OSRM chạy nền)
    void renderTrackOnMap(displayPoints, parkStops)
    renderTimeline(journalEntries)
    computeStats(displayPoints)
    const parkLabel = parkStops.length ? ` · ${parkStops.length} lần đỗ ≥30p` : ''
    setTrackStatus(`${displayPoints.length} điểm GPS${parkLabel}`, true)

    if (journalEntries.length) {
      enrichTimelinePlaces(journalEntries, seq).catch(() => {})
    }

    if (mayHaveMore) {
      console.warn(
        '[Playback] GPS: đã tải tối đa số trang cho phép; có thể còn điểm chưa lấy. Tăng MAX_TRACK_PAGES nếu cần.',
      )
    }
  } catch (e) {
    console.error('[Playback] loadGpsTrack error:', e)
    setTrackStatus('Lỗi tải GPS', false)
  }
}

// ─── Timeline (Nhật ký GPS: bắt đầu / đỗ ≥30p / kết thúc) ─────────────────

/** playback.js:1659-1733 — nội dung do components/Timeline.tsx render từ store. */
export function renderTimeline(journalEntries: JournalEntry[]): JournalEntry[] {
  const parkN = journalEntries.filter((e) => e.type === 'park').length
  set({ timelineCount: `${journalEntries.length} sự kiện${parkN ? ` · ${parkN} đỗ xe` : ''}` })

  if (!journalEntries.length) {
    renderTimelineEmpty()
    return []
  }

  set({ timeline: { kind: 'entries', entries: journalEntries, places: {}, active: null } })
  return journalEntries
}

/** Listener click `.pb-timeline-item` (playback.js:1714-1731). */
export function onTimelineItemClick(journalEntries: JournalEntry[], ei: number): void {
  const entry = journalEntries[ei]
  const pt = entry?.p
  if (!pt) return
  focusMapOnJournalEntry(entry, ei, journalEntries)
  set((s) =>
    s.timeline.kind === 'entries' && s.timeline.entries === journalEntries
      ? { timeline: { ...s.timeline, active: ei } }
      : {},
  )

  const { currentDevice, currentVehicleObj, lastSearchRange } = get()
  if (currentDevice && currentVehicleObj) {
    const seekTime = formatFullDt(pt.time)
    // #pb-channel-select / #pb-stream-type không có trong index.html → '1'
    const ch = '1'
    const st = '1'
    const matchedFile = findFileMetaForTime(seekTime, ch)
    void showPlaybackIframe(currentVehicleObj, ch, seekTime, lastSearchRange.endFmt, st, '', matchedFile)
  }
}

/** playback.js:1735-1740 */
export function renderTimelineEmpty(): void {
  set({ timeline: { kind: 'empty' }, timelineCount: '0 điểm' })
}

// ─── Stats ───────────────────────────────────────────────────────────────

/** playback.js:1743-1767 — giá trị #pb-stat-* (trả về để test bảng; bản gốc không trả gì). */
export function computeStats(points: TrackPoint[]): TrackStats | undefined {
  if (!points.length) return
  let totalKm = 0,
    maxSpeed = 0
  let movingSec = 0
  for (let i = 1; i < points.length; i++) {
    totalKm += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
    if (points[i].speed > maxSpeed) maxSpeed = points[i].speed

    const tPrev = parseTrackTime(points[i - 1].time)
    const tCur = parseTrackTime(points[i].time)
    if (tPrev == null || tCur == null) continue
    const dt = (tCur - tPrev) / 1000
    if (dt <= 0 || dt > MAX_SEGMENT_GAP_SEC) continue
    const sp = Math.max(points[i].speed || 0, points[i - 1].speed || 0)
    if (sp > MOVING_SPEED_KMH) movingSec += dt
  }
  const stats: TrackStats = {
    distance: `${totalKm.toFixed(2)} km`,
    maxspeed: `${Math.round(maxSpeed)} km/h`,
    duration: points.length < 2 || movingSec < 1 ? '--' : secondsToHms(Math.round(movingSec)),
    points: `${points.length}`,
  }
  set({ stats })
  return stats
}
