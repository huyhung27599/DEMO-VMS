import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('leaflet', () => import('../../test/leafletMock'))

import L, { type Map as LeafletMap } from 'leaflet'
import { created, resetLeafletMock, type FakeMap } from '../../test/leafletMock'
import { addTerritorialOverlays } from './territorial'
import { addTileLayerWithFallback } from './tiles'

function fakeMap(): FakeMap {
  return L.map(document.createElement('div')) as unknown as FakeMap
}

beforeEach(() => resetLeafletMock())
afterEach(() => vi.unstubAllGlobals())

describe('addTileLayerWithFallback (map.js:79-97)', () => {
  it('thêm CartoDB nền + tile GEIC; lỗi tile lần thứ 3 -> gỡ GEIC (giữ CartoDB)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const map = fakeMap()
    const layer = addTileLayerWithFallback(map as unknown as LeafletMap)
    expect(created.tileLayers).toHaveLength(2)
    expect(created.tileLayers[0].url).toBe(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    )
    expect(created.tileLayers[0].options).toEqual({
      minZoom: 6,
      maxZoom: 19,
      attribution: '@GTEL - GEIC',
      subdomains: 'abcd',
    })
    const custom = created.tileLayers[1]
    expect(layer).toBe(custom)
    expect(custom.url).toBe('https://map.geicdashcam.cloud/tiles/tile/{z}/{x}/{y}.png')
    expect(custom.options).toEqual({ minZoom: 6, maxZoom: 19, attribution: '@GTEL - GEIC' })
    expect(custom.addTo).toHaveBeenCalledWith(map)

    custom.fire('tileerror')
    custom.fire('tileerror')
    expect(map.removeLayer).not.toHaveBeenCalled()
    custom.fire('tileerror')
    expect(map.removeLayer).toHaveBeenCalledWith(custom)
    expect(warn).toHaveBeenCalledWith('[MapModule] Custom tile server lỗi, chuyển sang CartoDB Voyager')
    // không thêm lớp fallback trùng
    custom.fire('tileerror')
    expect(created.tileLayers).toHaveLength(2)
    expect(map.removeLayer).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('addTerritorialOverlays (map.js:16-60)', () => {
  it('fetch ba file geojson theo thứ tự và thêm nhãn Hoàng Sa / Trường Sa', async () => {
    const fetchMock = vi.fn(async () => ({ json: async () => ({ type: 'FeatureCollection', features: [] }) }))
    vi.stubGlobal('fetch', fetchMock)
    const map = fakeMap()
    addTerritorialOverlays(map as unknown as LeafletMap)
    expect(fetchMock.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      '/hoangsa.geojson',
      '/truongsa.geojson',
      '/biendong.geojson',
    ])
    expect(L.circleMarker).toHaveBeenCalledWith([16.5, 112.2], {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
      interactive: false,
    })
    expect(L.circleMarker).toHaveBeenCalledWith([10.0, 114.5], expect.anything())
    await vi.waitFor(() => expect(created.geoJSON).toHaveLength(3))

    const opts = created.geoJSON[0].options as {
      style: (f: unknown) => unknown
      pointToLayer: (f: unknown, ll: { lat: number; lng: number }) => unknown
      onEachFeature: (f: unknown, l: { bindPopup: (s: string) => void }) => void
    }
    expect(opts.style({ geometry: { type: 'Point' } })).toEqual({})
    expect(opts.style({ geometry: { type: 'Polygon' } })).toEqual({ weight: 0, fillOpacity: 0, opacity: 0 })
    opts.pointToLayer({}, { lat: 10, lng: 100 })
    expect(L.polygon).toHaveBeenLastCalledWith(expect.any(Array), {
      weight: 0.5,
      color: '#e0d6bd',
      fillColor: '#f2efe9',
      fillOpacity: 1,
      interactive: false,
    })
    const layer = { bindPopup: vi.fn() }
    opts.onEachFeature({ properties: { name: 'A', name_en: 'B', description: 'C' } }, layer)
    expect(layer.bindPopup).toHaveBeenCalledWith('<b>A</b><br><i>B</i><br><small>C</small>')
    opts.onEachFeature({ properties: {} }, layer)
    expect(layer.bindPopup).toHaveBeenCalledTimes(1)
  })

  it('lỗi fetch -> console.warn("GeoJSON lỗi:")', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('x'))))
    addTerritorialOverlays(fakeMap() as unknown as LeafletMap)
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(3))
    expect(warn).toHaveBeenCalledWith('GeoJSON lỗi:', '/hoangsa.geojson', expect.any(Error))
    warn.mockRestore()
  })
})
