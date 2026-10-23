import L from 'leaflet'
import { addTerritorialOverlays } from '../../shared/map/territorial'
import { addTileLayerWithFallback } from '../../shared/map/tiles'
import { showToast } from '../../shared/ui/toastStore'
import {
  formatTrackTime,
  MAP_COLOR_END,
  MAP_COLOR_MOVING,
  MAP_COLOR_PARK,
  MAP_COLOR_ROUTE,
  MAP_COLOR_START,
  type JournalEntry,
  type Loose,
  type ParkStop,
  type TrackPoint,
} from './lib'
import { usePlaybackStore } from './store'
import { handleResize as handleResizeVideo, setTrackMap, setTrackStatus } from './videoController'

// Bản đồ hành trình #pb-track-map của window.PlaybackModule (playback.js:1388-1650, 1769-1950).
// Biến module `_map/_trackLayer/_markerLayer/...` giữ ở đây như bản gốc; phần DOM do bản gốc tự
// ghi (placeholder, #pb-track-legend, icon nút, class fullscreen của card) chuyển sang usePlaybackStore.

const set = usePlaybackStore.setState
const get = usePlaybackStore.getState

let map: L.Map | null = null
let trackLayer: L.Polyline | null = null
let markerLayer: L.LayerGroup | null = null
let startMarker: L.Marker | null = null
let endMarker: L.Marker | null = null
let parkMarkers: L.Marker[] = []
/** true sau khi user chọn mốc trên Nhật ký GPS — tránh fitBounds ghi đè zoom */
let mapJournalFocused = false
let highlightedMarker: L.Marker | null = null
let animMarker: L.Marker | null = null
let animTimer: ReturnType<typeof setTimeout> | null = null
let animIndex = 0
let trackPoints: TrackPoint[] = []
let trackMapOverlayFs = false

/** #pb-track-map do React render (bản gốc: document.getElementById('pb-track-map')) */
let container: HTMLElement | null = null

/** ref callback của #pb-track-map */
export function attachTrackMapContainer(el: HTMLElement | null): void {
  if (el) container = el
}

/** `_trackPoints = displayPoints` (loadGpsTrack) */
export function setTrackPoints(points: TrackPoint[]): void {
  trackPoints = points
}

export function getTrackPoints(): TrackPoint[] {
  return trackPoints
}

const TRACK_POPUP_OPTS: L.PopupOptions = { closeButton: true, autoClose: false, closeOnClick: false }

/** Popup giống khi phát hành trình: giờ + tốc độ (km/h) */
export const buildSpeedTimePopup = (p: Loose): string => {
  const spd = Number(p?.speed)
  const speedStr = Number.isFinite(spd) ? spd.toFixed(0) : '0'
  return `<div class="pb-track-popup"><div class="pb-track-popup-time">${formatTrackTime(p?.time)}</div><div class="pb-track-popup-speed">${speedStr} km/h</div></div>`
}

const openMarkerPopupSoon = (marker: L.Marker | null, delayMs = 350): void => {
  if (!marker) return
  setTimeout(() => {
    try {
      // `marker.getLatLng` luôn có (bản gốc kiểm tra thừa)
      if (map) marker.openPopup()
    } catch {
      /* ignore */
    }
  }, delayMs)
}

// Shared marker dot HTML (size, color)
const dotIcon = (color: string, size = 14, borderColor = '#fff'): L.DivIcon =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid ${borderColor};border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

const markerDiv = (marker: L.Marker): HTMLElement | null =>
  (marker.getElement()?.querySelector('div') as HTMLElement | null | undefined) ?? null

const clearMarkerHighlight = (): void => {
  if (!highlightedMarker) return
  const el = markerDiv(highlightedMarker)
  if (el) el.style.transform = ''
  if (highlightedMarker.setZIndexOffset) highlightedMarker.setZIndexOffset(450)
  highlightedMarker = null
}

const highlightMarker = (marker: L.Marker | undefined): void => {
  if (!marker) return
  clearMarkerHighlight()
  highlightedMarker = marker
  const el = markerDiv(marker)
  if (el) el.style.transform = 'scale(1.35)'
  marker.setZIndexOffset?.(800)
}

const getJournalEntryLatLng = (entry: JournalEntry, ei: number, journalEntries: JournalEntry[]): L.LatLng | null => {
  if (!entry) return null
  if (entry.type === 'park') {
    const parkIdx = journalEntries.slice(0, ei).filter((e) => e.type === 'park').length
    const m = parkMarkers[parkIdx]
    if (m) return m.getLatLng()
  }
  if (entry.type === 'start' && startMarker) return startMarker.getLatLng()
  if (entry.type === 'end' && endMarker) return endMarker.getLatLng()
  const p = entry.p
  if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) return L.latLng(p.lat, p.lng)
  return null
}

/** playback.js:1462-1476 */
export const focusMapOnJournalEntry = (entry: JournalEntry, ei: number, journalEntries: JournalEntry[]): void => {
  initMap()
  if (!map || !entry) return
  const latlng = getJournalEntryLatLng(entry, ei, journalEntries)
  if (!latlng) return
  mapJournalFocused = true
  const zoom = entry.type === 'park' ? 17 : 16
  map.flyTo(latlng, zoom, { animate: true, duration: 0.75 })
  if (entry.type === 'park') {
    const parkIdx = journalEntries.slice(0, ei).filter((e) => e.type === 'park').length
    highlightMarker(parkMarkers[parkIdx])
  } else {
    clearMarkerHighlight()
  }
}

/** Chấm xe đang di chuyển (phát lại hành trình) — nền trắng, viền tối để nổi trên bản đồ */
const movingDotIcon = (size = 18): L.DivIcon => dotIcon(MAP_COLOR_MOVING, size, '#334155')

/** playback.js:1481-1497 — #pb-track-legend được render bởi components/TrackMap.tsx */
const renderMapLegend = (parkCount: number): void => {
  if (!container) return
  set({ trackLegend: parkCount })
}

/** playback.js:1499-1534 — Route API của OSRM theo từng chunk 50 điểm (gối đầu 1 điểm). */
export async function getOsrmMatchedRoute(points: TrackPoint[]): Promise<[number, number][] | null> {
  if (!points || points.length < 2) return null
  const snappedLatlngs: [number, number][] = []
  const CHUNK_SIZE = 50 // Route API ổn định nhất với ~50 điểm mỗi request

  // Cứ mỗi chunk, ta nối điểm cuối của chunk trước vào đầu chunk này
  for (let i = 0; i < points.length; i += CHUNK_SIZE - 1) {
    const chunk = points.slice(i, i + CHUNK_SIZE)
    if (chunk.length < 2) break

    const coords = chunk.map((p) => `${p.lng},${p.lat}`).join(';')
    // Sử dụng Route API thay cho Match API: Route API sẽ ép tìm đường đi qua các điểm này
    // Phù hợp hơn với dữ liệu GPS thưa thớt (sparse GPS)
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?geometries=geojson&overview=full`

    try {
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const routeCoords: [number, number][] = data.routes[0].geometry.coordinates
          routeCoords.forEach((c) => snappedLatlngs.push([c[1], c[0]]))
          continue
        }
      }
    } catch (e) {
      console.warn('[Playback] OSRM route chunk lỗi:', e)
    }

    // Fallback nếu OSRM lỗi ở chunk này
    chunk.forEach((p) => snappedLatlngs.push([p.lat, p.lng]))
  }
  return snappedLatlngs.length > 0 ? snappedLatlngs : null
}

/** playback.js:1536-1590 (loadGpsTrack gọi mà không await) */
export async function renderTrackOnMap(points: TrackPoint[], parkStops: ParkStop[] = []): Promise<void> {
  initMap()
  if (!map) return
  if (trackLayer) {
    map.removeLayer(trackLayer)
    trackLayer = null
  }
  if (markerLayer) {
    map.removeLayer(markerLayer)
    markerLayer = null
  }

  const rawLatlngs: [number, number][] = points.map((p) => [p.lat, p.lng])
  markerLayer = L.layerGroup().addTo(map)

  // Hiển thị tạm đường nối điểm thô (nét đứt mờ) trong lúc chờ OSRM
  trackLayer = L.polyline(rawLatlngs, { color: MAP_COLOR_ROUTE, weight: 4, opacity: 0.3, dashArray: '5, 5' }).addTo(
    map,
  )

  // Lấy đường đi đã Snap-to-Road
  const snappedRoute = await getOsrmMatchedRoute(points)
  // (bản gốc dùng `_map`/`_trackLayer`/`_markerLayer` hiện tại sau await — giữ nguyên, kể cả khi đã bị clearTrack)
  const m = map as L.Map
  if (snappedRoute && snappedRoute.length > 0) {
    m.removeLayer(trackLayer as L.Polyline) // Xoá đường nháp
    trackLayer = L.polyline(snappedRoute, { color: MAP_COLOR_ROUTE, weight: 5, opacity: 0.9 }).addTo(m)
  } else {
    // Nếu OSRM thất bại hoàn toàn, vẽ đường thô nhưng đậm
    ;(trackLayer as L.Polyline).setStyle({ opacity: 0.9, dashArray: null, weight: 4 } as unknown as L.PathOptions)
  }

  startMarker = L.marker(rawLatlngs[0], { icon: dotIcon(MAP_COLOR_START, 16), zIndexOffset: 500 }).addTo(
    markerLayer as L.LayerGroup,
  )
  parkMarkers = []
  ;(parkStops || []).forEach((stop) => {
    const pm = L.marker([stop.lat, stop.lng], {
      icon: dotIcon(MAP_COLOR_PARK, 16, '#1e293b'),
      zIndexOffset: 450,
    }).addTo(markerLayer as L.LayerGroup)
    parkMarkers.push(pm)
  })

  if (points.length > 1) {
    endMarker = L.marker(rawLatlngs.at(-1) as [number, number], {
      icon: dotIcon(MAP_COLOR_END, 16),
      zIndexOffset: 500,
    }).addTo(markerLayer as L.LayerGroup)
  } else {
    endMarker = null
  }

  renderMapLegend((parkStops || []).length)
  try {
    m.closePopup()
  } catch {
    /* ignore */
  }
  if (!mapJournalFocused) {
    m.fitBounds((trackLayer as L.Polyline).getBounds(), { padding: [20, 20] })
  }
  // document.querySelector('.pb-map-placeholder-text')?.style.setProperty('display', 'none')
  set({ trackMapInitialized: true })

  // Ensure map size is correct after initial rendering and data loading
  ;[100, 500, 1000].forEach((delay) => {
    setTimeout(() => {
      if (map) map.invalidateSize()
    }, delay)
  })
}

/** playback.js:1610-1632 — tạo bản đồ lần đầu cần dùng (renderTrackOnMap / click nhật ký). */
export function initMap(): void {
  if (map) return
  if (!container) return
  // container.querySelectorAll('.pb-map-placeholder-text').forEach(e => (e.style.display = 'none'))
  set({ trackMapInitialized: true })

  // Khởi tạo map với tọa độ mặc định (Việt Nam)
  map = L.map(container, {
    zoomControl: true,
    scrollWheelZoom: true,
    attributionControl: true,
    minZoom: 6,
  }).setView([16.0, 106.0], 6)
  setTrackMap(map)

  map.attributionControl.setPrefix('')
  addTileLayerWithFallback(map)
  // addTerritorialOverlays của playback.js giống hệt map.js → dùng chung shared/map/territorial
  addTerritorialOverlays(map)

  // Đảm bảo map nhận diện đúng kích thước container ngay sau khi khởi tạo
  setTimeout(() => {
    if (map) map.invalidateSize()
  }, 400)
}

/** playback.js:1634-1651 */
export function clearTrack(): void {
  stopTrackAnimation()
  if (map) {
    // (vòng forEach no-op trên window.PlaybackModule[k] của bản gốc bị bỏ)
    if (trackLayer) {
      map.removeLayer(trackLayer)
      trackLayer = null
    }
    if (markerLayer) {
      map.removeLayer(markerLayer)
      markerLayer = null
    }
    if (animMarker) {
      map.removeLayer(animMarker)
      animMarker = null
    }
  }
  startMarker = null
  endMarker = null
  parkMarkers = []
  mapJournalFocused = false
  clearMarkerHighlight()
  trackPoints = []
  set({ trackLegend: null })
}

/** playback.js:1653-1656 — bản gốc không có nơi gọi. */
export function fitMapTrack(): void {
  if (map && trackLayer) map.fitBounds(trackLayer.getBounds(), { padding: [20, 20] })
  else if (map) map.setView([10.776, 106.701], 10)
}

// ─── Track Animation ─────────────────────────────────────────────────────

/** playback.js:1771 — click #pb-track-play-btn */
export const toggleTrackAnimation = (): void => (animTimer ? stopTrackAnimation() : startTrackAnimation())

/** playback.js:1773-1803 */
export function startTrackAnimation(): void {
  if (!trackPoints.length || !map) return
  stopTrackAnimation()
  try {
    map.closePopup()
  } catch {
    /* ignore */
  }
  set({ trackAnimating: true })

  const m = map
  const pt0 = trackPoints[0]
  const marker = L.marker([pt0.lat, pt0.lng], {
    icon: movingDotIcon(18),
    zIndexOffset: 999,
  })
    .bindPopup(buildSpeedTimePopup(pt0), TRACK_POPUP_OPTS)
    .addTo(m)
  animMarker = marker
  animIndex = 0
  openMarkerPopupSoon(animMarker, 80)

  ;(function step() {
    if (animIndex >= trackPoints.length) {
      stopTrackAnimation()
      return
    }
    const pt = trackPoints[animIndex]
    const am = animMarker as L.Marker
    am.setLatLng([pt.lat, pt.lng])
    am.setPopupContent(buildSpeedTimePopup(pt))
    if (!am.isPopupOpen()) am.openPopup()
    if (animIndex % 5 === 0 && !m.getBounds().contains([pt.lat, pt.lng]))
      m.panTo([pt.lat, pt.lng], { animate: true, duration: 0.3 })
    animIndex++
    animTimer = setTimeout(step, Math.max(30, 150 - (pt.speed || 0)))
  })()

  setTrackStatus('Đang phát lại hành trình', true)
}

/** playback.js:1805-1812 */
export function stopTrackAnimation(): void {
  if (animTimer) {
    clearTimeout(animTimer)
    animTimer = null
  }
  set({ trackAnimating: false })
  if (map && animMarker) {
    map.removeLayer(animMarker)
    animMarker = null
  }
  animIndex = 0
  if (trackPoints.length) setTrackStatus(`${trackPoints.length} điểm GPS`, true)
}

// ─── Misc ────────────────────────────────────────────────────────────────

/** playback.js:1821-1823 — `_map?.invalidateSize()` (bản đồ đã đăng ký qua setTrackMap trong initMap) */
export function handleResize(): void {
  handleResizeVideo()
}

/** playback.js:1825-1829 — bản gốc không gắn/không export: port nhưng không nối vào UI. */
export function toggleFullscreen(): void {
  const card = document.getElementById('pb-player-card')
  if (!card) return
  if (document.fullscreenElement) document.exitFullscreen()
  else card.requestFullscreen().catch((e) => console.warn('Fullscreen failed:', e))
}

// ─── Fullscreen bản đồ hành trình (playback.js:1831-1950) ────────────────

const getTrackMapFullscreenEl = (): HTMLElement | null =>
  document.getElementById('pb-track-card') || document.querySelector<HTMLElement>('#playback-section .pb-track-card')

const getNativeFullscreenElement = (): Element | null => {
  const d = document as Loose
  return d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement || null
}

const isTrackMapFullscreenActive = (): boolean => {
  const card = getTrackMapFullscreenEl()
  return !!(trackMapOverlayFs || (card && getNativeFullscreenElement() === card))
}

const requestNativeFullscreen = (el: HTMLElement): Promise<void> => {
  const e = el as Loose
  const fn = e.requestFullscreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.msRequestFullscreen
  if (!fn) return Promise.reject(new Error('Fullscreen API unavailable'))
  try {
    const ret = fn.call(el)
    return ret && typeof ret.then === 'function' ? ret : Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
}

const exitNativeFullscreen = (): Promise<void> => {
  const d = document as Loose
  const fn = d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen
  if (!fn) return Promise.reject(new Error('exitFullscreen unavailable'))
  try {
    const ret = fn.call(document)
    return ret && typeof ret.then === 'function' ? ret : Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
}

export function enterTrackMapOverlayFullscreen(): void {
  const card = getTrackMapFullscreenEl()
  if (!card) return
  set({ trackFsMode: true })
  document.body.classList.add('pb-track-fs-body-lock')
  trackMapOverlayFs = true
  updateTrackMapFullscreenBtn()
  refreshTrackMapAfterFullscreen()
}

export function exitTrackMapOverlayFullscreen(): void {
  set({ trackFsMode: false })
  document.body.classList.remove('pb-track-fs-body-lock')
  trackMapOverlayFs = false
  updateTrackMapFullscreenBtn()
  refreshTrackMapAfterFullscreen()
}

function refreshTrackMapAfterFullscreen(): void {
  setTimeout(() => {
    try {
      map?.invalidateSize()
      if (trackLayer && !mapJournalFocused) map?.fitBounds(trackLayer.getBounds(), { padding: [30, 30] })
    } catch {
      /* ignore */
    }
  }, 200)
}

function updateTrackMapFullscreenBtn(): void {
  if (!document.getElementById('pb-map-fullscreen-btn')) return
  set({ trackMapFsActive: isTrackMapFullscreenActive() })
}

/** listener fullscreenchange (+ webkit/moz/MS) trên document */
export function onTrackMapFullscreenChange(): void {
  const card = getTrackMapFullscreenEl()
  const nativeFs = getNativeFullscreenElement()
  // `card.classList.contains('pb-track-fs-mode')` ⇔ store.trackFsMode
  if (!nativeFs && card && !get().trackFsMode) {
    trackMapOverlayFs = false
    document.body.classList.remove('pb-track-fs-body-lock')
  }
  updateTrackMapFullscreenBtn()
  refreshTrackMapAfterFullscreen()
}

/** playback.js:1925-1950 — click #pb-map-fullscreen-btn */
export function toggleTrackMapFullscreen(): void {
  const card = getTrackMapFullscreenEl()
  if (!card) {
    showToast('Không tìm thấy vùng bản đồ.', 'warning')
    return
  }

  if (isTrackMapFullscreenActive()) {
    if (getNativeFullscreenElement() === card) exitNativeFullscreen().catch(() => {})
    if (trackMapOverlayFs || get().trackFsMode) exitTrackMapOverlayFullscreen()
    return
  }

  const otherFs = getNativeFullscreenElement()
  const openFs = () =>
    requestNativeFullscreen(card)
      .then(() => refreshTrackMapAfterFullscreen())
      .catch(() => enterTrackMapOverlayFullscreen())

  if (otherFs && otherFs !== card) {
    exitNativeFullscreen()
      .then(openFs)
      .catch(() => enterTrackMapOverlayFullscreen())
    return
  }
  openFs()
}

function onTrackMapKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && trackMapOverlayFs) exitTrackMapOverlayFullscreen()
}

const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
let eventsBound = false

/** Phần document-listener của bindEvents (playback.js:422-427) — gọi từ playbackInit (một lần). */
export function bindTrackMapEvents(): void {
  if (eventsBound) return
  eventsBound = true
  FULLSCREEN_EVENTS.forEach((ev) => document.addEventListener(ev, onTrackMapFullscreenChange, { passive: true }))
  document.addEventListener('keydown', onTrackMapKeydown, { passive: true })
}

/** Chỉ dùng trong test. */
export function resetTrackMapController(): void {
  if (animTimer) clearTimeout(animTimer)
  map = null
  trackLayer = null
  markerLayer = null
  startMarker = null
  endMarker = null
  parkMarkers = []
  mapJournalFocused = false
  highlightedMarker = null
  animMarker = null
  animTimer = null
  animIndex = 0
  trackPoints = []
  trackMapOverlayFs = false
  container = null
  if (eventsBound) {
    FULLSCREEN_EVENTS.forEach((ev) => document.removeEventListener(ev, onTrackMapFullscreenChange))
    document.removeEventListener('keydown', onTrackMapKeydown)
    eventsBound = false
  }
  document.body.classList.remove('pb-track-fs-body-lock')
  setTrackMap(null)
}

export const trackMapController = {
  initMap,
  renderTrackOnMap,
  clearTrack,
  fitMapTrack,
  startTrackAnimation,
  stopTrackAnimation,
  toggleTrackAnimation,
  toggleFullscreen,
  toggleTrackMapFullscreen,
  handleResize,
}
