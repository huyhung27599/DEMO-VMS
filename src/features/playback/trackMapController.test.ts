import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('leaflet', () => import('../../test/leafletMock'))
vi.mock('../../shared/map/territorial', () => ({ addTerritorialOverlays: vi.fn() }))
vi.mock('hls.js', () => ({ default: class {} }))

import L from 'leaflet'
import { created, resetLeafletMock, type FakeMap } from '../../test/leafletMock'
import { addTerritorialOverlays } from '../../shared/map/territorial'
import { useToastStore } from '../../shared/ui/toastStore'
import type { TrackPoint } from './lib'
import { resetPlaybackStore, usePlaybackStore } from './store'
import {
  attachTrackMapContainer,
  bindTrackMapEvents,
  clearTrack,
  fitMapTrack,
  focusMapOnJournalEntry,
  getOsrmMatchedRoute,
  handleResize,
  initMap,
  renderTrackOnMap,
  resetTrackMapController,
  setTrackPoints,
  startTrackAnimation,
  stopTrackAnimation,
  toggleTrackAnimation,
  toggleTrackMapFullscreen,
} from './trackMapController'
import { getTrackMap } from './videoController'

const pt = (i: number, speed = 40): TrackPoint => ({
  lat: 10 + i / 1000,
  lng: 106 + i / 1000,
  speed,
  time: `2026-10-19 08:${String(i).padStart(2, '0')}:00`,
  addr: '',
})
const pts = (n: number, speed?: number) => Array.from({ length: n }, (_, i) => pt(i, speed))
const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const st = () => usePlaybackStore.getState()

let fetchMock: ReturnType<typeof vi.fn>
let mapEl: HTMLDivElement
let card: HTMLDivElement

beforeEach(() => {
  vi.useFakeTimers()
  resetLeafletMock()
  resetTrackMapController()
  resetPlaybackStore()
  useToastStore.setState({ toasts: [] })
  vi.mocked(L.map).mockClear()
  vi.mocked(addTerritorialOverlays).mockClear()
  fetchMock = vi.fn(async () => okJson({ code: 'NoRoute' }))
  vi.stubGlobal('fetch', fetchMock)
  card = document.createElement('div')
  card.id = 'pb-track-card'
  mapEl = document.createElement('div')
  mapEl.id = 'pb-track-map'
  card.appendChild(mapEl)
  const btn = document.createElement('button')
  btn.id = 'pb-map-fullscreen-btn'
  card.appendChild(btn)
  document.body.appendChild(card)
  attachTrackMapContainer(mapEl)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  resetTrackMapController()
  card.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const theMap = (): FakeMap => created.maps[0]

describe('initMap', () => {
  it('tạo bản đồ một lần trên #pb-track-map, tile (log [Playback]) + lãnh thổ, invalidateSize +400 ms', async () => {
    initMap()
    initMap()
    expect(L.map).toHaveBeenCalledTimes(1)
    expect(L.map).toHaveBeenCalledWith(mapEl, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
      minZoom: 6,
    })
    expect(theMap().setView).toHaveBeenCalledWith([16.0, 106.0], 6)
    expect(theMap().attributionControl.setPrefix).toHaveBeenCalledWith('')
    expect(addTerritorialOverlays).toHaveBeenCalledWith(theMap())
    expect(getTrackMap()).toBe(theMap())
    expect(st().trackMapInitialized).toBe(true)
    expect(created.tileLayers[0].url).toBe('https://map.geicdashcam.cloud/tiles/tile/{z}/{x}/{y}.png')
    expect(created.tileLayers[0].options).toEqual({ minZoom: 6, maxZoom: 19, attribution: '@GTEL - GEIC' })
    for (let i = 0; i < 3; i++) created.tileLayers[0].fire('tileerror')
    expect(console.warn).toHaveBeenCalledWith('[Playback] Custom tile server lỗi, chuyển sang CartoDB Voyager')
    expect(created.tileLayers[1].url).toBe('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png')
    expect(created.tileLayers[1].options).toEqual({
      minZoom: 6,
      maxZoom: 19,
      attribution: '@GTEL - GEIC',
      subdomains: 'abcd',
    })

    await vi.advanceTimersByTimeAsync(399)
    expect(theMap().invalidateSize).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(theMap().invalidateSize).toHaveBeenCalledTimes(1)
  })

  it('handleResize → invalidateSize của bản đồ hành trình', () => {
    handleResize()
    initMap()
    handleResize()
    expect(theMap().invalidateSize).toHaveBeenCalledTimes(1)
  })

  it('fitMapTrack không có track → setView([10.776, 106.701], 10)', () => {
    initMap()
    fitMapTrack()
    expect(theMap().setView).toHaveBeenLastCalledWith([10.776, 106.701], 10)
  })
})

describe('getOsrmMatchedRoute', () => {
  it('URL OSRM giống hệt bản gốc; chunk 50 điểm gối đầu 1 điểm, gọi tuần tự', async () => {
    const points = pts(99)
    const route = await getOsrmMatchedRoute(points)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const coords1 = points
      .slice(0, 50)
      .map((p) => `${p.lng},${p.lat}`)
      .join(';')
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://router.project-osrm.org/route/v1/driving/${coords1}?geometries=geojson&overview=full`,
    )
    expect(fetchMock.mock.calls[1][0]).toContain(`driving/${points[49].lng},${points[49].lat};`)
    // NoRoute → fallback điểm thô cho cả 2 chunk (50 + 50)
    expect(route).toHaveLength(100)
    expect(route?.[0]).toEqual([points[0].lat, points[0].lng])
  })

  it('Ok → lấy geometry (lng,lat → lat,lng); < 2 điểm → null', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ code: 'Ok', routes: [{ geometry: { coordinates: [[106, 10], [106.5, 10.5]] } }] }),
    )
    await expect(getOsrmMatchedRoute(pts(3))).resolves.toEqual([
      [10, 106],
      [10.5, 106.5],
    ])
    await expect(getOsrmMatchedRoute(pts(1))).resolves.toBeNull()
  })
})

describe('renderTrackOnMap', () => {
  it('đường nháp nét đứt → đường OSRM, marker bắt đầu/đỗ/kết thúc, legend, fitBounds, invalidateSize 100/500/1000', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ code: 'Ok', routes: [{ geometry: { coordinates: [[106, 10], [106.5, 10.5]] } }] }),
    )
    const stop = {
      startIdx: 0,
      endIdx: 1,
      centerIdx: 0,
      lat: 10.5,
      lng: 106.5,
      startTime: '',
      endTime: '',
      durationSec: 1800,
      addr: '',
    }
    const done = renderTrackOnMap(pts(3), [stop])
    const draft = created.polylines[0]
    expect(draft.options).toEqual({ color: '#2563eb', weight: 4, opacity: 0.3, dashArray: '5, 5' })
    await done
    expect(theMap().removeLayer).toHaveBeenCalledWith(draft)
    expect(created.polylines[1].options).toEqual({ color: '#2563eb', weight: 5, opacity: 0.9 })
    expect(created.markers.map((m) => (m.options as { zIndexOffset: number }).zIndexOffset)).toEqual([500, 450, 500])
    expect(st().trackLegend).toBe(1)
    expect(theMap().fitBounds).toHaveBeenCalledWith(created.polylines[1].getBounds(), { padding: [20, 20] })
    theMap().invalidateSize.mockClear()
    await vi.advanceTimersByTimeAsync(1000)
    // 400 (initMap) + 100/500/1000
    expect(theMap().invalidateSize).toHaveBeenCalledTimes(4)
  })

  it('OSRM lỗi ở chunk → đường liền từ điểm thô; 1 điểm (route null) → setStyle đậm, không marker kết thúc', async () => {
    fetchMock.mockRejectedValue(new Error('down'))
    const points = pts(2)
    await renderTrackOnMap(points)
    expect(console.warn).toHaveBeenCalledWith('[Playback] OSRM route chunk lỗi:', expect.any(Error))
    expect(created.polylines[1].latlngs).toEqual(points.map((p) => [p.lat, p.lng]))
    expect(created.polylines[1].options).toEqual({ color: '#2563eb', weight: 5, opacity: 0.9 })
    expect(st().trackLegend).toBe(0)

    resetLeafletMock()
    fetchMock.mockClear()
    await renderTrackOnMap(pts(1))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(created.polylines).toHaveLength(1)
    expect(created.polylines[0].setStyle).toHaveBeenCalledWith({ opacity: 0.9, dashArray: null, weight: 4 })
    expect(created.markers).toHaveLength(1)
  })

  it('clearTrack gỡ legend; click nhật ký (focus) → không fitBounds lần sau', async () => {
    await renderTrackOnMap(pts(2))
    clearTrack()
    expect(st().trackLegend).toBeNull()
    focusMapOnJournalEntry({ type: 'start', idx: 0, p: pt(0) }, 0, [{ type: 'start', idx: 0, p: pt(0) }])
    expect(theMap().flyTo).toHaveBeenCalledWith({ lat: 10, lng: 106 }, 16, { animate: true, duration: 0.75 })
    theMap().fitBounds.mockClear()
    await renderTrackOnMap(pts(2))
    expect(theMap().fitBounds).not.toHaveBeenCalled()
  })
})

describe('track animation', () => {
  it('bước animation dùng độ trễ Math.max(30, 150 - speed); hết điểm thì dừng', async () => {
    initMap()
    const points = [pt(0, 0), pt(1, 100), pt(2, 200)]
    setTrackPoints(points)
    const spy = vi.spyOn(globalThis, 'setTimeout')
    startTrackAnimation()
    expect(st().trackAnimating).toBe(true)
    expect(st().trackStatus).toEqual({ text: 'Đang phát lại hành trình', active: true })
    const delays = () => spy.mock.calls.map((c) => c[1]).filter((d) => d !== 80)
    // bước 0 chạy ngay: speed 0 → 150
    expect(delays()).toEqual([150])
    await vi.advanceTimersByTimeAsync(150)
    expect(delays()).toEqual([150, 50])
    await vi.advanceTimersByTimeAsync(50)
    expect(delays()).toEqual([150, 50, 30])
    const anim = created.markers[0]
    expect(anim.setLatLng).toHaveBeenLastCalledWith([points[2].lat, points[2].lng])
    expect(anim.popupContent).toBe(
      '<div class="pb-track-popup"><div class="pb-track-popup-time">08:02:00</div><div class="pb-track-popup-speed">200 km/h</div></div>',
    )
    await vi.advanceTimersByTimeAsync(30)
    expect(st().trackAnimating).toBe(false)
    expect(theMap().removeLayer).toHaveBeenCalledWith(anim)
    expect(st().trackStatus).toEqual({ text: '3 điểm GPS', active: true })
  })

  it('toggle: đang chạy → dừng; không có điểm → không làm gì', () => {
    initMap()
    toggleTrackAnimation()
    expect(st().trackAnimating).toBe(false)
    setTrackPoints(pts(5))
    toggleTrackAnimation()
    expect(st().trackAnimating).toBe(true)
    toggleTrackAnimation()
    expect(st().trackAnimating).toBe(false)
    stopTrackAnimation()
  })
})

describe('fullscreen bản đồ hành trình', () => {
  it('requestFullscreen bị từ chối → overlay (class + body lock), nút "Thoát"; Esc thoát', async () => {
    bindTrackMapEvents()
    ;(card as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen = vi.fn(() =>
      Promise.reject(new Error('denied')),
    )
    toggleTrackMapFullscreen()
    await vi.advanceTimersByTimeAsync(0)
    expect(st().trackFsMode).toBe(true)
    expect(st().trackMapFsActive).toBe(true)
    expect(document.body.classList.contains('pb-track-fs-body-lock')).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(st().trackFsMode).toBe(false)
    expect(st().trackMapFsActive).toBe(false)
    expect(document.body.classList.contains('pb-track-fs-body-lock')).toBe(false)
  })

  it('native fullscreen: fullscreenchange cập nhật nút; bấm lại → exitFullscreen', async () => {
    bindTrackMapEvents()
    let fsEl: Element | null = null
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsEl })
    const exit = vi.fn(async () => {
      fsEl = null
    })
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit })
    ;(card as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen = vi.fn(async () => {
      fsEl = card
    })
    toggleTrackMapFullscreen()
    await vi.advanceTimersByTimeAsync(0)
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(st().trackMapFsActive).toBe(true)
    expect(st().trackFsMode).toBe(false)

    toggleTrackMapFullscreen()
    await vi.advanceTimersByTimeAsync(0)
    expect(exit).toHaveBeenCalledTimes(1)
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(st().trackMapFsActive).toBe(false)
    delete (document as unknown as Record<string, unknown>).fullscreenElement
    delete (document as unknown as Record<string, unknown>).exitFullscreen
  })

  it('không tìm thấy card → toast cảnh báo', () => {
    card.remove()
    toggleTrackMapFullscreen()
    expect(useToastStore.getState().toasts.map((t) => [t.message, t.type])).toEqual([
      ['Không tìm thấy vùng bản đồ.', 'warning'],
    ])
  })
})
