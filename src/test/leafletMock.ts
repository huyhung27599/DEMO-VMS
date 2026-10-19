import { vi } from 'vitest'

// Bản giả Leaflet cho jsdom (không có layout). Dùng: vi.mock('leaflet', () => import('../../test/leafletMock'))
// Mỗi factory lưu lại các instance đã tạo trong `created` để test kiểm tra.

type Handler = (...args: unknown[]) => void
type LatLng = { lat: number; lng: number }

function toLatLng(v: unknown): LatLng {
  if (Array.isArray(v)) return { lat: Number(v[0]), lng: Number(v[1]) }
  return v as LatLng
}

function evented() {
  const handlers = new Map<string, Handler[]>()
  return {
    handlers,
    on: vi.fn(function (this: unknown, name: string, fn: Handler) {
      handlers.set(name, [...(handlers.get(name) ?? []), fn])
      return this
    }),
    fire(name: string, ...args: unknown[]) {
      handlers.get(name)?.forEach((fn) => fn(...args))
    },
  }
}

export type FakeMap = ReturnType<typeof makeMap>
export type FakeMarker = ReturnType<typeof makeMarker>

function makeMap(el: HTMLElement | string, options?: unknown) {
  const ev = evented()
  let zoom = 0
  const map = {
    el,
    options,
    ...ev,
    layers: [] as unknown[],
    setView: vi.fn((_c: unknown, z?: number) => {
      if (typeof z === 'number') zoom = z
      return map
    }),
    getZoom: vi.fn(() => zoom),
    attributionControl: { setPrefix: vi.fn() },
    invalidateSize: vi.fn(),
    removeLayer: vi.fn((l: unknown) => {
      map.layers = map.layers.filter((x) => x !== l)
      return map
    }),
    panTo: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
  }
  return map
}

function makeLayer() {
  const ev = evented()
  const layer = {
    ...ev,
    addTo: vi.fn((m: FakeMap) => {
      m.layers.push(layer)
      return layer
    }),
    bindTooltip: vi.fn(() => layer),
    bindPopup: vi.fn(() => layer),
  }
  return layer
}

function makeMarker(latlng: unknown, options?: { icon?: unknown }) {
  let pos = toLatLng(latlng)
  let popupContent: unknown = null
  let popupOpen = false
  const popup = { setContent: vi.fn((c: unknown) => ((popupContent = c), popup)) }
  const marker = {
    options,
    icon: options?.icon,
    addTo: vi.fn((m: FakeMap) => {
      m.layers.push(marker)
      return marker
    }),
    getLatLng: vi.fn(() => ({ ...pos })),
    setLatLng: vi.fn((v: unknown) => {
      pos = toLatLng(v)
      return marker
    }),
    setIcon: vi.fn((i: unknown) => {
      marker.icon = i
      return marker
    }),
    bindPopup: vi.fn((c: unknown) => {
      popupContent = c
      return marker
    }),
    setPopupContent: vi.fn((c: unknown) => {
      popupContent = c
      return marker
    }),
    getPopup: vi.fn(() => (popupContent === null ? undefined : popup)),
    isPopupOpen: vi.fn(() => popupOpen),
    openPopup: vi.fn(() => {
      popupOpen = true
      return marker
    }),
    get popupContent() {
      return popupContent
    },
    popup,
  }
  return marker
}

export const created = {
  maps: [] as FakeMap[],
  markers: [] as FakeMarker[],
  tileLayers: [] as Array<ReturnType<typeof makeLayer> & { url: string; options: unknown }>,
  geoJSON: [] as Array<{ data: unknown; options: unknown }>,
}

export function resetLeafletMock(): void {
  created.maps.length = 0
  created.markers.length = 0
  created.tileLayers.length = 0
  created.geoJSON.length = 0
}

const L = {
  map: vi.fn((el: HTMLElement | string, options?: unknown) => {
    const m = makeMap(el, options)
    created.maps.push(m)
    return m
  }),
  tileLayer: vi.fn((url: string, options?: unknown) => {
    const l = Object.assign(makeLayer(), { url, options })
    created.tileLayers.push(l)
    return l
  }),
  geoJSON: vi.fn((data: unknown, options?: unknown) => {
    created.geoJSON.push({ data, options })
    return makeLayer()
  }),
  polygon: vi.fn((latlngs: unknown, options?: unknown) => ({ latlngs, options })),
  circleMarker: vi.fn(() => makeLayer()),
  divIcon: vi.fn((options: unknown) => ({ divIcon: options })),
  marker: vi.fn((latlng: unknown, options?: { icon?: unknown }) => {
    const m = makeMarker(latlng, options)
    created.markers.push(m)
    return m
  }),
  featureGroup: vi.fn((layers: unknown[]) => ({ layers, getBounds: vi.fn(() => ({ bounds: layers })) })),
}

export default L
