import L from 'leaflet'
import { api } from '../../shared/api/endpoints'
import { isAuthenticated } from '../../shared/auth/session'
import { sanitizeHTML } from '../../shared/lib/sanitize'
import { addTerritorialOverlays } from '../../shared/map/territorial'
import { addTileLayerWithFallback } from '../../shared/map/tiles'
import {
  ANIM_DURATION,
  ease,
  getCustomIcon,
  getTrackingIconSvg,
  isStatusOnline,
  lerp,
  setCustomIcon,
  statusUid,
  type DeviceStatus,
} from './lib'
import { notifyNavItemClick } from '../../app/useActiveSection'
import { resetMapStore, useMapStore } from './store'
import './map.css'

// Port của window.MapModule (frontend/js/map.js). Singleton dùng chung cho #map-container
// (MapSection) và #liveview-map (LiveviewMap). Trạng thái module giữ ở biến module như bản gốc;
// followMode / selectedVehicleId / tracking được phản chiếu sang useMapStore.

type MarkerMap = Record<string, L.Marker>

let isInitialized = false
let mapLiveView: L.Map | null = null
let mapMain: L.Map | null = null
let markersLiveView: MarkerMap = {}
let markersMain: MarkerMap = {}
let lastValidStatuses: DeviceStatus[] = []
let vehicleMapCache: Record<string, string> | null = null
let markerAnims: Record<string, { rafId: number | null }> = {}
const pendingTimers = new Set<ReturnType<typeof setTimeout>>()

// Container do React render (thay cho document.getElementById lúc init)
const containers: { main: HTMLElement | null; liveView: HTMLElement | null } = { main: null, liveView: null }

const followMode = () => useMapStore.getState().followMode
const selectedVehicleId = () => useMapStore.getState().followTarget

// setTimeout của bản gốc; giữ id để test có thể dọn (resetMapController)
function later(fn: () => void, ms: number): void {
  const id = setTimeout(() => {
    pendingTimers.delete(id)
    fn()
  }, ms)
  pendingTimers.add(id)
}

// Popup dựng bằng chuỗi HTML như bản gốc; `onclick="MapModule.xxx('uid')"` được thay bằng
// data-map-action + listener click (capture) trên container bản đồ.
function onPopupAction(e: MouseEvent): void {
  const el = (e.target as Element | null)?.closest?.('[data-map-action]')
  if (!el) return
  const uid = el.getAttribute('data-uid') ?? ''
  const action = el.getAttribute('data-map-action')
  if (action === 'toggle-icon-settings') toggleIconSettings(uid)
  else if (action === 'save-icon') saveIcon(uid)
  else if (action === 'live-monitor') openLiveMonitor(uid)
}

/** CTA popup «Giám sát trực tuyến» → focus xe + chuyển tab liveview (+ chọn xe nếu có). */
function openLiveMonitor(uid: string): void {
  focusOnVehicle(uid)
  void import('../liveview/actions').then(({ onVehicleChange }) => {
    void import('../liveview/store').then(({ useLiveviewStore }) => {
      const cache = useLiveviewStore.getState().vehiclesCache
      const idx = cache.findIndex((v) => {
        const dl = v?.dl
        if (!Array.isArray(dl) || !dl[0]) return false
        return String(dl[0].id || dl[0].devIdno || '') === uid
      })
      if (idx >= 0) onVehicleChange(String(idx))
    })
  })
  window.location.hash = 'liveview'
  notifyNavItemClick('liveview')
}

/** map.js:106-124 — tạo một bản đồ trên container. */
function createMap(el: HTMLElement): L.Map {
  const m = L.map(el, { minZoom: 6 }).setView([16.0, 106.0], 6)
  m.attributionControl.setPrefix(false)
  addTileLayerWithFallback(m)
  addTerritorialOverlays(m)
  // Tắt follow khi user kéo tay trên bản đồ
  m.on('dragstart', disableFollow)
  el.addEventListener('click', onPopupAction, true)
  return m
}

/**
 * Gắn container. Bản gốc tìm `#liveview-map` / `#map-container` lúc init; container gắn sau
 * init (vd. Liveview mount muộn) được tạo bản đồ ngay, như thể nó đã có trong DOM lúc init.
 */
export function attach({ main, liveView }: { main?: HTMLElement; liveView?: HTMLElement }): void {
  if (liveView) containers.liveView = liveView
  if (main) containers.main = main
  if (!isInitialized) return
  if (liveView && !mapLiveView) mapLiveView = createMap(liveView)
  if (main && !mapMain) mapMain = createMap(main)
}

// ── Init (map.js:100-151) ──
export function init(): void {
  if (isInitialized) return

  if (containers.liveView) mapLiveView = createMap(containers.liveView)
  if (containers.main) mapMain = createMap(containers.main)

  // Nút "Tập trung bản đồ": onClick của MapSection gọi centerMapOnAllMarkers().
  // #map-follow-btn không tồn tại trong index.html -> phần nút theo dõi xe không chạy (bỏ).

  isInitialized = true
  useMapStore.setState({ isInitialized: true })
  startTracking()

  later(() => {
    if (mapLiveView) mapLiveView.invalidateSize()
    if (mapMain) mapMain.invalidateSize()
  }, 500)
}

function disableFollow(): void {
  if (!followMode()) return
  useMapStore.setState({ followMode: false })
}

// ── Polling (map.js:171-211) ──
/** Lần gọi ngay + setInterval 1500 ms do query `vehiclePositionsQueryOptions` thực hiện khi trackingActive. */
export function startTracking(): void {
  useMapStore.setState({ trackingActive: true })
}

export function stopTracking(): void {
  useMapStore.setState({ trackingActive: false })
  Object.values(markerAnims).forEach((a) => {
    if (a.rafId) cancelAnimationFrame(a.rafId)
  })
}

export async function fetchOnce(): Promise<void> {
  if (!isAuthenticated()) {
    stopTracking()
    return
  }
  try {
    const [statusRes, vehicleRes] = await Promise.all([
      api.getDeviceStatus(),
      vehicleMapCache ? Promise.resolve(null) : api.queryUserVehicle(),
    ])

    // Cache danh sách xe
    if (vehicleRes && vehicleRes.result === 0 && Array.isArray(vehicleRes.vehicles)) {
      const cache: Record<string, string> = {}
      vehicleMapCache = cache
      ;(vehicleRes.vehicles as Array<Record<string, unknown>>).forEach((v) => {
        const dl = v.dl as Array<{ id?: string }> | undefined
        const devId = (dl && dl.length > 0 ? dl[0].id : v.id) as string | undefined
        if (devId) cache[devId] = (v.nm || v.vehiIdno || v.vehi_idno || v.plate) as string
      })
    }

    if (statusRes && statusRes.result === 0 && Array.isArray(statusRes.status)) {
      const vehicleMap = vehicleMapCache || {}
      const validStatuses = (statusRes.status as DeviceStatus[]).map((s) => {
        const k = s.devIdno || s.id || s.DevIDNO
        if (k && vehicleMap[k]) s.vehicleName = vehicleMap[k]
        return s
      })
      lastValidStatuses = validStatuses
      useMapStore.setState({ statuses: validStatuses })
      updateMapMarkers(validStatuses)
    }
  } catch (e) {
    console.error('[MapModule] Lỗi poll GPS:', e)
  }
}

function toLatLng(s: DeviceStatus): [number, number] | null {
  const rawLng = s.jing || s.lng || s.mlng || 0
  const rawLat = s.wei || s.lat || s.mlat || 0
  if (!rawLng || !rawLat || rawLng <= 0 || rawLat <= 0) return null
  const lat = rawLat > 1000 ? rawLat / 1000000 : rawLat
  const lng = rawLng > 1000 ? rawLng / 1000000 : rawLng
  return [lat, lng]
}

// ── Follow: pan mượt về xe (map.js:214-234) ──
// Chỉ được gọi từ nút #map-follow-btn (không có trong index.html) -> không bao giờ chạy, như bản gốc.
export function panToFollowTarget(): void {
  let targetId = selectedVehicleId()
  if (!targetId) {
    const online = lastValidStatuses.filter(isStatusOnline)
    if (online.length >= 1) targetId = online[0].id || online[0].devIdno || online[0].DevIDNO || null
  }
  if (!targetId) return

  const s = lastValidStatuses.find((x) => statusUid(x) === targetId)
  if (!s) return
  const pos = toLatLng(s)
  if (!pos) return

  if (mapLiveView) mapLiveView.panTo(pos, { animate: true, duration: 0.5 })
  if (mapMain) mapMain.panTo(pos, { animate: true, duration: 0.5 })
}

// ── Smooth lerp animation (map.js:241-270) ──
function animateMarker(
  uid: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  markers: L.Marker[],
  isFollowTarget: boolean,
): void {
  const existing = markerAnims[uid]
  if (existing && existing.rafId) cancelAnimationFrame(existing.rafId)

  const startTime = performance.now()
  const anim: { rafId: number | null } = { rafId: null }
  markerAnims[uid] = anim

  const step = (now: number) => {
    const t = Math.min((now - startTime) / ANIM_DURATION, 1)
    const et = ease(t)
    const lat = lerp(fromLat, toLat, et)
    const lng = lerp(fromLng, toLng, et)

    markers.forEach((m) => {
      if (m) m.setLatLng([lat, lng])
    })

    // Nếu xe đang được follow mà đang dịch chuyển, dời bản đồ theo từng pixel
    if (followMode() && isFollowTarget) {
      if (mapLiveView) mapLiveView.setView([lat, lng], mapLiveView.getZoom(), { animate: false })
      if (mapMain) mapMain.setView([lat, lng], mapMain.getZoom(), { animate: false })
    }

    if (t < 1) {
      anim.rafId = requestAnimationFrame(step)
    } else {
      anim.rafId = null
    }
  }
  anim.rafId = requestAnimationFrame(step)
}

function attrEscape(s: string): string {
  return sanitizeHTML(s).replace(/"/g, '&quot;')
}

// ── Update markers (map.js:405-578) ──
export function updateMapMarkers(input: DeviceStatus[]): void {
  if (!mapLiveView && !mapMain) return
  let deviceStatuses = input

  const selected = selectedVehicleId()
  if (selected) {
    deviceStatuses = deviceStatuses.filter((s) => statusUid(s) === selected)
  }

  // Chỉ hiển thị xe online
  deviceStatuses = deviceStatuses.filter(isStatusOnline)

  const currentIds = new Set(deviceStatuses.map(statusUid))

  // Xóa xe không còn trong danh sách
  for (const id in markersLiveView) {
    if (!currentIds.has(id)) {
      if (mapLiveView) mapLiveView.removeLayer(markersLiveView[id])
      delete markersLiveView[id]
    }
  }
  for (const id in markersMain) {
    if (!currentIds.has(id)) {
      if (mapMain) mapMain.removeLayer(markersMain[id])
      delete markersMain[id]
    }
  }

  // Xác định id xe đang follow hiện tại
  let followTargetId: string | null | undefined = selected
  if (!followTargetId) {
    const online = deviceStatuses.filter(isStatusOnline)
    if (online.length > 0) followTargetId = statusUid(online[0])
  }

  deviceStatuses.forEach((s) => {
    const uid = statusUid(s)
    if (!uid) return

    const isFollowTarget = followMode() && uid === followTargetId

    const pos = toLatLng(s)
    if (!pos) return
    const [lat, lng] = pos
    const isOnline = isStatusOnline(s)
    const spd = typeof s.speed === 'number' ? s.speed : typeof s.sp === 'number' ? (s.sp / 10).toFixed(1) : 0
    const dispName = s.vehicleName || uid
    const heading = s.hx || s.dir || s.hangXiang || s.course || 0

    // Custom Icon Configuration
    const custIcon: Partial<{ type: string; color: string }> = getCustomIcon(uid) || {}
    const userColor = attrEscape(custIcon.color || '#10b981') // localStorage -> thuộc tính HTML
    const userType = custIcon.type || 'navigation'

    // Time
    let t = s.tim || s.gpsTime || s.gt || s.lastUpdate
    let timeText = '--'
    if (t) {
      if (typeof t === 'number') {
        if (t < 10000000000) t *= 1000
        timeText = new Date(t as number).toLocaleString('vi-VN')
      } else if (typeof t === 'string') timeText = t.replace(/\.\d+$/, '')
    }

    let additionalInfo = ''
    if (s.lc) additionalInfo += `<div><strong>Quãng đường:</strong> ${(s.lc / 1000).toFixed(1)} km</div>`
    if (s.yl) additionalInfo += `<div><strong>Nhiên liệu:</strong> ${(s.yl / 100).toFixed(1)} L</div>`
    if (s.sn) additionalInfo += `<div><strong>Vệ tinh GPS:</strong> ${sanitizeHTML(String(s.sn))}</div>`

    const statusText = isOnline
      ? '<span style="color:#16a34a;font-weight:700">● Trực tuyến</span>'
      : '<span style="color:#e11d48;font-weight:700">● Ngoại tuyến</span>'
    const addr =
      (typeof s.addr === 'string' && s.addr) ||
      (typeof s.address === 'string' && s.address) ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`

    const popupContent = `
        <div class="map-popup-card" style="font-family:var(--font-main);min-width:220px;max-width:280px;">
          <h4 style="margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid #eef2f6;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:0.95rem;font-weight:700;color:#0f172a;">
             <span>${sanitizeHTML(dispName)}</span>
             <span style="display:inline-flex;align-items:center;gap:6px;font-size:0.72rem;">
               ${statusText}
               <i class="fa-solid fa-palette" style="cursor:pointer;color:#94a3b8;font-size:12px;" data-map-action="toggle-icon-settings" data-uid="${attrEscape(uid)}" title="Tuỳ chỉnh icon"></i>
             </span>
          </h4>
          <div style="font-size:0.8rem;line-height:1.7;color:#334155">
            <div><strong>Tài xế:</strong> ${s.dn ? sanitizeHTML(s.dn) : '—'}</div>
            <div><strong>Vận tốc:</strong> ${spd} km/h</div>
            <div><strong>Hướng quay:</strong> ${sanitizeHTML(String(heading))}°</div>
            <div><strong>Vị trí:</strong> ${sanitizeHTML(String(addr))}</div>
            <div><strong>Cập nhật:</strong> ${sanitizeHTML(timeText)}</div>
            <div><strong>Tọa độ:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
            ${additionalInfo}
          </div>
          <button type="button" data-map-action="live-monitor" data-uid="${attrEscape(uid)}"
            style="margin-top:12px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border:none;border-radius:10px;background:#e11d48;color:#fff;font-size:0.82rem;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-video" aria-hidden="true"></i> Giám sát trực tuyến
          </button>
          <div id="icon-settings-${attrEscape(uid)}" style="display:none; margin-top:10px; padding:8px; background:#f0f2f5; border-radius:8px; font-size:12px;">
             <div style="margin-bottom:6px;display:flex;justify-content:space-between;">
               Khung xe:
               <select id="icon-type-${attrEscape(uid)}" style="padding:2px 4px; border-radius:3px; border:1px solid #ddd; outline:none;">
                  <option value="navigation" ${userType === 'navigation' ? 'selected' : ''}>Mũi tên (Mặc định)</option>
                  <option value="car" ${userType === 'car' ? 'selected' : ''}>Ô tô</option>
                  <option value="truck" ${userType === 'truck' ? 'selected' : ''}>Xe tải / Buýt</option>
               </select>
             </div>
             <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
               Màu sắc:
               <input type="color" id="icon-color-${attrEscape(uid)}" value="${userColor}" style="border:none; width:30px; height:20px; padding:0; cursor:pointer;">
             </div>
             <button type="button" data-map-action="save-icon" data-uid="${attrEscape(uid)}" class="btn btn-primary" style="width:100%; padding:4px 0; font-size:12px;"><i class="fa-solid fa-save"></i> Lưu giao diện</button>
          </div>
        </div>`

    // SVG Icon (100% transparent - không có nền xám như PNG)
    const svgShape = getTrackingIconSvg(userType, userColor, isOnline)
    const markerHtml = `
        <div style="transform:rotate(${attrEscape(String(heading))}deg);transition:transform 0.4s ease;display:flex;align-items:center;justify-content:center;">
          ${svgShape}
        </div>`

    const iconPx = userType === 'navigation' ? 20 : 36
    const markerIcon = L.divIcon({
      html: markerHtml,
      className: 'custom-nav-icon',
      iconSize: [iconPx, iconPx],
      iconAnchor: [iconPx / 2, iconPx / 2],
      popupAnchor: [0, -(iconPx / 2)],
    })

    const upsert = (map: L.Map, markers: MarkerMap, animKey: string) => {
      if (markers[uid]) {
        const prev = markers[uid].getLatLng()
        if (prev.lat !== lat || prev.lng !== lng) {
          animateMarker(animKey, prev.lat, prev.lng, lat, lng, [markers[uid]], isFollowTarget)
        } else if (isFollowTarget && followMode()) {
          map.setView([lat, lng], map.getZoom(), { animate: false })
        }
        markers[uid].setIcon(markerIcon)

        // Nếu popup đang mở thì update popup để giữ form input mà không bị đóng
        if (markers[uid].isPopupOpen()) {
          const popup = markers[uid].getPopup()
          // Chỉ setContent nếu chưa đang bật chế độ settings (để không reset màu đang chọn)
          const settingsEl = document.getElementById(`icon-settings-${uid}`)
          if (!settingsEl || settingsEl.style.display === 'none') {
            popup?.setContent(popupContent)
          }
        } else {
          markers[uid].setPopupContent(popupContent)
        }
      } else {
        const m = L.marker([lat, lng], { icon: markerIcon }).addTo(map)
        m.bindPopup(popupContent)
        markers[uid] = m
        if (isFollowTarget && followMode()) map.setView([lat, lng], map.getZoom(), { animate: false })
      }
    }

    // LiveView Map
    if (mapLiveView) upsert(mapLiveView, markersLiveView, uid + '_lv')
    // Main Map
    if (mapMain) upsert(mapMain, markersMain, uid + '_mn')
  })
}

// ── Helpers (map.js:581-627) ──
export function centerMapOnAllMarkers(mapObj: L.Map | null = mapMain, markersObj: MarkerMap = markersMain): void {
  if (!mapObj || Object.keys(markersObj).length === 0) return
  const group = L.featureGroup(Object.values(markersObj))
  mapObj.fitBounds(group.getBounds(), { padding: [50, 50] })
}

export function focusOnVehicle(deviceId: string | null): void {
  useMapStore.setState({ followTarget: deviceId || null })
  updateMapMarkers(lastValidStatuses)

  if (!deviceId) {
    centerMapOnAllMarkers(mapMain, markersMain)
    return
  }

  later(() => {
    if (mapLiveView && markersLiveView[deviceId]) {
      const m = markersLiveView[deviceId]
      mapLiveView.flyTo(m.getLatLng(), 15, { animate: true, duration: 1.5 })
      later(() => {
        if (m.getPopup()) m.openPopup()
      }, 1500)
    }
    if (mapMain && markersMain[deviceId]) {
      const m = markersMain[deviceId]
      mapMain.flyTo(m.getLatLng(), 15, { animate: true, duration: 1.5 })
      later(() => {
        if (m.getPopup()) m.openPopup()
      }, 1500)
    }
  }, 100)
}

/**
 * Bản gốc KHÔNG có MapModule.focusOnLocation: liveview.js:802 kiểm tra
 * `window.MapModule.focusOnLocation` nên lời gọi bị bỏ qua. Giữ là hàm rỗng.
 */
export function focusOnLocation(lat: number, lng: number): void {
  void lat
  void lng
}

export function handleResize(): void {
  if (mapLiveView) mapLiveView.invalidateSize()
  if (mapMain) mapMain.invalidateSize()
}

export function toggleIconSettings(uid: string): void {
  const el = document.getElementById(`icon-settings-${uid}`)
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none'
    useMapStore.setState({ iconSettingsOpen: el.style.display === 'block' })
  }
}

export function saveIcon(uid: string): void {
  const typeEl = document.getElementById(`icon-type-${uid}`) as HTMLSelectElement | null
  const colorEl = document.getElementById(`icon-color-${uid}`) as HTMLInputElement | null
  if (typeEl && colorEl) {
    setCustomIcon(uid, typeEl.value, colorEl.value)
    updateMapMarkers(lastValidStatuses) // Render lại ngay lập tức
  }
}

export const mapController = {
  attach,
  init,
  startTracking,
  stopTracking,
  updateMapMarkers,
  focusOnVehicle,
  focusOnLocation,
  handleResize,
  centerMapOnAllMarkers,
  toggleIconSettings,
  saveIcon,
  get isInitialized() {
    return isInitialized
  },
}

/** Chỉ dùng trong test: đưa singleton về trạng thái lúc tải trang. */
export function resetMapController(): void {
  Object.values(markerAnims).forEach((a) => {
    if (a.rafId) cancelAnimationFrame(a.rafId)
  })
  pendingTimers.forEach(clearTimeout)
  pendingTimers.clear()
  containers.main?.removeEventListener('click', onPopupAction, true)
  containers.liveView?.removeEventListener('click', onPopupAction, true)
  containers.main = null
  containers.liveView = null
  isInitialized = false
  mapLiveView = null
  mapMain = null
  markersLiveView = {}
  markersMain = {}
  lastValidStatuses = []
  vehicleMapCache = null
  markerAnims = {}
  resetMapStore()
}
