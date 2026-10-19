import { queryClient } from '../../shared/query/queryClient'
import { GEO_REQUEST_DELAY_MS, MAX_GEO_ENRICH_ROWS, type JournalEntry } from './lib'
import { usePlaybackStore } from './store'

// Tra cứu địa điểm cho Nhật ký GPS (playback.js:1217-1265). `_geocodeCache` (Map) → queryClient
// (key `['playback','geocode', lat.toFixed(4), lng.toFixed(4)]`, staleTime/gcTime Infinity).

const set = usePlaybackStore.setState
const get = usePlaybackStore.getState

/** playback.js:13 `_timelinePlaceSeq` — tăng mỗi lần tải GPS mới để hủy tra cứu địa điểm cũ */
let timelinePlaceSeq = 0

/** `_timelinePlaceSeq++; const seq = _timelinePlaceSeq;` (loadGpsTrack) */
export function nextTimelinePlaceSeq(): number {
  timelinePlaceSeq++
  return timelinePlaceSeq
}

export const geocodeKey = (lat: number, lng: number) =>
  ['playback', 'geocode', Number(lat).toFixed(4), Number(lng).toFixed(4)] as const

/** Thân try/catch của reverseGeocodeCached: lỗi → '' (và '' cũng được cache như bản gốc). */
async function fetchReverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=vi`
    const r = await fetch(url)
    if (!r.ok) {
      return ''
    }
    const j = await r.json()
    const parts = [j.locality, j.city, j.principalSubdivision, j.countryName].filter(Boolean)
    const label = parts.length ? parts.join(', ') : ''
    return label
  } catch {
    return ''
  }
}

/** playback.js:1217-1234 */
export function reverseGeocodeCached(lat: number, lng: number): Promise<string> {
  return queryClient.fetchQuery({
    queryKey: geocodeKey(lat, lng),
    queryFn: () => fetchReverseGeocode(lat, lng),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** `timelineBody.querySelector('.pb-timeline-item[data-entry-i] .pb-tl-place')` còn tồn tại? */
const rowExists = (journalEntries: JournalEntry[]): boolean => {
  const tl = get().timeline
  return tl.kind === 'entries' && tl.entries === journalEntries
}

/** `row.textContent = text` */
const setPlace = (journalEntries: JournalEntry[], ei: number, text: string): void => {
  set((s) =>
    s.timeline.kind === 'entries' && s.timeline.entries === journalEntries
      ? { timeline: { ...s.timeline, places: { ...s.timeline.places, [ei]: text } } }
      : {},
  )
}

/** playback.js:1236-1265 — `timelineBody` (#pb-timeline-body luôn có) thay bằng store.timeline. */
export async function enrichTimelinePlaces(journalEntries: JournalEntry[], seq: number): Promise<void> {
  if (seq !== timelinePlaceSeq) return
  let geoLookups = 0
  for (let ei = 0; ei < journalEntries.length; ei++) {
    if (seq !== timelinePlaceSeq) return
    const entry = journalEntries[ei]
    const p = entry.p
    if (!rowExists(journalEntries) || !p) continue

    if (p.addr && String(p.addr).trim()) {
      setPlace(journalEntries, ei, `Địa điểm: ${String(p.addr).trim()}`)
      continue
    }

    if (geoLookups >= MAX_GEO_ENRICH_ROWS) {
      setPlace(journalEntries, ei, `Địa điểm: ${p.lat.toFixed(5)}°, ${p.lng.toFixed(5)}° (mở bản đồ để xem)`)
      continue
    }

    geoLookups++
    const place = await reverseGeocodeCached(p.lat, p.lng)
    if (seq !== timelinePlaceSeq) return
    setPlace(
      journalEntries,
      ei,
      place ? `Địa điểm: ${place}` : `Địa điểm: ${p.lat.toFixed(5)}°, ${p.lng.toFixed(5)}°`,
    )

    await new Promise((r) => setTimeout(r, GEO_REQUEST_DELAY_MS))
  }
}

/** Chỉ dùng trong test. */
export function resetGeocode(): void {
  timelinePlaceSeq = 0
  queryClient.removeQueries({ queryKey: ['playback', 'geocode'] })
}
