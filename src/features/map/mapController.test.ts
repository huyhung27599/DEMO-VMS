import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('leaflet', () => import('../../test/leafletMock'))
vi.mock('../../shared/map/territorial', () => ({ addTerritorialOverlays: vi.fn() }))
vi.mock('../../shared/api/endpoints', () => ({
  api: { getDeviceStatus: vi.fn(), queryUserVehicle: vi.fn() },
}))

import L from 'leaflet'
import { created, resetLeafletMock, type FakeMap, type FakeMarker } from '../../test/leafletMock'
import { addTerritorialOverlays } from '../../shared/map/territorial'
import { api } from '../../shared/api/endpoints'
import { fetchOnce, mapController, resetMapController } from './mapController'
import { useMapStore } from './store'

let mainEl: HTMLDivElement
let lvEl: HTMLDivElement

function setup(): { lv: FakeMap; main: FakeMap } {
  mapController.attach({ main: mainEl, liveView: lvEl })
  mapController.init()
  const lv = created.maps.find((m) => m.el === lvEl)!
  const main = created.maps.find((m) => m.el === mainEl)!
  return { lv, main }
}

function markersOn(map: FakeMap): FakeMarker[] {
  return map.layers.filter((l): l is FakeMarker => created.markers.includes(l as FakeMarker))
}

// focusOnVehicle / saveIcon vẽ lại từ lastValidStatuses (chỉ fetchOnce cập nhật) -> nạp qua fetchOnce
async function load(statuses: object[]): Promise<void> {
  vi.mocked(api.getDeviceStatus).mockResolvedValue({ result: 0, status: statuses.map((x) => ({ ...x })) })
  vi.mocked(api.queryUserVehicle).mockResolvedValue({ result: 0, vehicles: [] })
  await fetchOnce()
}

const ONLINE = { id: 'DEV1', ol: 1, jing: 106500000, wei: 16200000, sp: 405, hx: 90, tim: 1700000000 }

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  sessionStorage.clear()
  sessionStorage.setItem('dashcam_auth_token', 'tok')
  resetLeafletMock()
  resetMapController()
  vi.mocked(L.map).mockClear()
  vi.mocked(addTerritorialOverlays).mockClear()
  vi.mocked(api.getDeviceStatus).mockReset()
  vi.mocked(api.queryUserVehicle).mockReset()
  mainEl = document.createElement('div')
  lvEl = document.createElement('div')
  document.body.append(mainEl, lvEl)
})

afterEach(() => {
  mainEl.remove()
  lvEl.remove()
  vi.useRealTimers()
})

describe('init (map.js:100-151)', () => {
  it('tạo hai bản đồ minZoom 6, setView([16,106],6), tile + overlay, bật tracking, invalidateSize sau 500 ms', () => {
    const { lv, main } = setup()
    expect(L.map).toHaveBeenCalledTimes(2)
    // liveview trước, main sau như bản gốc
    expect(created.maps[0]).toBe(lv)
    for (const m of [lv, main]) {
      expect(m.options).toEqual({ minZoom: 6 })
      expect(m.setView).toHaveBeenCalledWith([16.0, 106.0], 6)
      expect(m.attributionControl.setPrefix).toHaveBeenCalledWith(false)
      expect(m.handlers.get('dragstart')).toHaveLength(1)
      expect(addTerritorialOverlays).toHaveBeenCalledWith(m)
    }
    expect(created.tileLayers.map((t) => t.url)).toEqual([
      'https://map.geicdashcam.cloud/tiles/tile/{z}/{x}/{y}.png',
      'https://map.geicdashcam.cloud/tiles/tile/{z}/{x}/{y}.png',
    ])
    expect(useMapStore.getState().trackingActive).toBe(true)
    expect(mapController.isInitialized).toBe(true)
    vi.advanceTimersByTime(499)
    expect(lv.invalidateSize).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(lv.invalidateSize).toHaveBeenCalledTimes(1)
    expect(main.invalidateSize).toHaveBeenCalledTimes(1)
  })

  it('gọi init lần hai không tạo thêm bản đồ', () => {
    setup()
    mapController.init()
    expect(L.map).toHaveBeenCalledTimes(2)
  })

  it('container chưa gắn lúc init -> bỏ qua; gắn sau init thì tạo bản đồ cho nó', () => {
    mapController.attach({ main: mainEl })
    mapController.init()
    expect(L.map).toHaveBeenCalledTimes(1)
    mapController.attach({ liveView: lvEl })
    expect(L.map).toHaveBeenCalledTimes(2)
    mapController.attach({ liveView: lvEl })
    expect(L.map).toHaveBeenCalledTimes(2)
  })
})

describe('updateMapMarkers (map.js:405-578)', () => {
  it('chỉ vẽ xe online có toạ độ, trên cả hai bản đồ, đổi đơn vị toạ độ /1e6', () => {
    const { lv, main } = setup()
    mapController.updateMapMarkers([
      { ...ONLINE, vehicleName: '29A-111', dn: '<b>Lan</b>' },
      { id: 'OFF', ol: 0, jing: 106, wei: 16 },
      { id: 'NOPOS', ol: 1, jing: 0, wei: 0 },
    ])
    expect(markersOn(lv)).toHaveLength(1)
    expect(markersOn(main)).toHaveLength(1)
    const m = markersOn(main)[0]
    expect(m.getLatLng()).toEqual({ lat: 16.2, lng: 106.5 })
    const html = m.popupContent as string
    expect(html).toContain('<span>29A-111</span>')
    expect(html).toContain('<div><strong>Vận tốc:</strong> 40.5 km/h</div>')
    expect(html).toContain('<div><strong>Hướng quay:</strong> 90°</div>')
    expect(html).toContain('<div><strong>Tài xế:</strong> &lt;b&gt;Lan&lt;/b&gt;</div>')
    expect(html).toContain('<div><strong>Tọa độ:</strong> 16.20000, 106.50000</div>')
    expect(html).toContain('Trực tuyến')
    expect(html).toContain('id="icon-settings-DEV1"')
    expect(L.divIcon).toHaveBeenLastCalledWith(
      expect.objectContaining({ className: 'custom-nav-icon', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18] }),
    )
    // follow mặc định bật: xe đầu tiên là mục tiêu -> setView không animate
    expect(main.setView).toHaveBeenLastCalledWith([16.2, 106.5], main.getZoom(), { animate: false })
  })

  it('xoá marker của xe không còn trong danh sách', () => {
    const { main } = setup()
    mapController.updateMapMarkers([ONLINE, { ...ONLINE, id: 'DEV2' }])
    expect(markersOn(main)).toHaveLength(2)
    mapController.updateMapMarkers([ONLINE])
    expect(main.removeLayer).toHaveBeenCalledTimes(1)
    expect(markersOn(main)).toHaveLength(1)
  })

  it('vị trí đổi -> trượt marker trong 1500 ms (requestAnimationFrame) và bản đồ bám theo', () => {
    const { main } = setup()
    mapController.updateMapMarkers([ONLINE])
    const m = markersOn(main)[0]
    main.setView.mockClear()
    mapController.updateMapMarkers([{ ...ONLINE, wei: 16300000 }])
    expect(m.getLatLng()).toEqual({ lat: 16.2, lng: 106.5 })
    vi.advanceTimersByTime(1600)
    expect(m.getLatLng().lat).toBeCloseTo(16.3)
    expect(main.setView).toHaveBeenCalled()
    expect(created.markers).toHaveLength(2) // không tạo marker mới
  })

  it('dragstart tắt follow: cập nhật sau đó không dời bản đồ', () => {
    const { lv, main } = setup()
    expect(useMapStore.getState().followMode).toBe(true)
    main.fire('dragstart')
    expect(useMapStore.getState().followMode).toBe(false)
    mapController.updateMapMarkers([ONLINE])
    mapController.updateMapMarkers([{ ...ONLINE, wei: 16300000 }])
    vi.advanceTimersByTime(1600)
    expect(main.setView).toHaveBeenCalledTimes(1) // chỉ lần setView lúc init
    expect(lv.setView).toHaveBeenCalledTimes(1)
    // dragstart trên liveview khi đã tắt -> không đổi gì
    lv.fire('dragstart')
    expect(useMapStore.getState().followMode).toBe(false)
  })

  it('icon tuỳ chỉnh lấy từ geic_vehicle_icons', () => {
    localStorage.setItem('geic_vehicle_icons', JSON.stringify({ DEV1: { type: 'truck', color: '#ff0000' } }))
    setup()
    mapController.updateMapMarkers([ONLINE])
    const icon = vi.mocked(L.divIcon).mock.lastCall![0] as { html: string }
    expect(icon.html).toContain('img/markers/truck.png')
    expect(icon.html).toContain('transform:rotate(90deg)')
  })
})

describe('fetchOnce (map.js:181-211)', () => {
  it('lần đầu gọi getDeviceStatus + queryUserVehicle, sau đó chỉ getDeviceStatus; gắn vehicleName từ cache', async () => {
    const { main } = setup()
    vi.mocked(api.getDeviceStatus).mockResolvedValue({ result: 0, status: [{ ...ONLINE }] })
    vi.mocked(api.queryUserVehicle).mockResolvedValue({
      result: 0,
      vehicles: [{ nm: '29A-111', dl: [{ id: 'DEV1' }] }],
    })
    await fetchOnce()
    expect(api.getDeviceStatus).toHaveBeenCalledWith()
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
    expect(markersOn(main)[0].popupContent).toContain('<span>29A-111</span>')
    await fetchOnce()
    expect(api.getDeviceStatus).toHaveBeenCalledTimes(2)
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
  })

  it('kết quả lỗi -> không cập nhật marker', async () => {
    const { main } = setup()
    vi.mocked(api.getDeviceStatus).mockResolvedValue({ result: 5 })
    vi.mocked(api.queryUserVehicle).mockResolvedValue({ result: 5 })
    await fetchOnce()
    expect(markersOn(main)).toHaveLength(0)
  })

  it('chưa đăng nhập -> stopTracking, không gọi API', async () => {
    setup()
    sessionStorage.clear()
    await fetchOnce()
    expect(api.getDeviceStatus).not.toHaveBeenCalled()
    expect(useMapStore.getState().trackingActive).toBe(false)
  })
})

describe('focusOnVehicle / center / resize / icon settings', () => {
  it('focusOnVehicle lọc theo xe, flyTo zoom 15 sau 100 ms, mở popup sau 1500 ms nữa', async () => {
    const { lv, main } = setup()
    await load([ONLINE, { ...ONLINE, id: 'DEV2' }])
    expect(markersOn(main)).toHaveLength(2)
    mapController.focusOnVehicle('DEV2')
    expect(useMapStore.getState().followTarget).toBe('DEV2')
    expect(markersOn(main)).toHaveLength(1)
    const m = markersOn(main)[0]
    vi.advanceTimersByTime(99)
    expect(main.flyTo).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(main.flyTo).toHaveBeenCalledWith({ lat: 16.2, lng: 106.5 }, 15, { animate: true, duration: 1.5 })
    expect(lv.flyTo).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1500)
    expect(m.openPopup).toHaveBeenCalledTimes(1)
  })

  it('focusOnVehicle(null) -> fitBounds bản đồ chính với padding 50', async () => {
    const { main } = setup()
    await load([ONLINE])
    mapController.focusOnVehicle(null)
    expect(main.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: [50, 50] })
  })

  it('centerMapOnAllMarkers không làm gì khi chưa có marker', () => {
    const { main } = setup()
    mapController.centerMapOnAllMarkers()
    expect(main.fitBounds).not.toHaveBeenCalled()
  })

  it('handleResize invalidateSize cả hai bản đồ', () => {
    const { lv, main } = setup()
    mapController.handleResize()
    expect(lv.invalidateSize).toHaveBeenCalledTimes(1)
    expect(main.invalidateSize).toHaveBeenCalledTimes(1)
  })

  it('focusOnLocation không tồn tại ở bản gốc -> không làm gì', () => {
    const { lv, main } = setup()
    mapController.focusOnLocation(10, 106)
    for (const m of [lv, main]) {
      expect(m.flyTo).not.toHaveBeenCalled()
      expect(m.panTo).not.toHaveBeenCalled()
    }
  })

  it('click biểu tượng bảng màu trong popup bật/tắt khung cài đặt; Lưu ghi geic_vehicle_icons và vẽ lại', async () => {
    setup()
    await load([ONLINE])
    const m = created.markers.find((x) => created.maps[1].layers.includes(x))!
    // Leaflet đặt nội dung popup bên trong container của bản đồ
    const popupEl = document.createElement('div')
    popupEl.innerHTML = m.popupContent as string
    mainEl.append(popupEl)

    const settings = document.getElementById('icon-settings-DEV1')!
    expect(settings.style.display).toBe('none')
    popupEl.querySelector<HTMLElement>('.fa-palette')!.click()
    expect(settings.style.display).toBe('block')
    expect(useMapStore.getState().iconSettingsOpen).toBe(true)

    ;(document.getElementById('icon-type-DEV1') as HTMLSelectElement).value = 'car'
    ;(document.getElementById('icon-color-DEV1') as HTMLInputElement).value = '#123456'
    vi.mocked(L.divIcon).mockClear()
    popupEl.querySelector<HTMLButtonElement>('button')!.click()
    expect(JSON.parse(localStorage.getItem('geic_vehicle_icons')!)).toEqual({ DEV1: { type: 'car', color: '#123456' } })
    // vẽ lại ngay cho cả hai bản đồ
    expect(L.divIcon).toHaveBeenCalledTimes(1)
    expect((vi.mocked(L.divIcon).mock.lastCall![0] as { html: string }).html).toContain('img/markers/car.png')

    popupEl.querySelector<HTMLElement>('.fa-palette')!.click()
    expect(settings.style.display).toBe('none')
  })
})
