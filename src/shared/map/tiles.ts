import L from 'leaflet'

// map.js:62-66 — tile layer với tự động chuyển sang server dự phòng
export const CUSTOM_TILE_URL = 'https://map.geicdashcam.cloud/tiles/tile/{z}/{x}/{y}.png'
export const FALLBACK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
export const FALLBACK_ATTR = '@GTEL - GEIC'
export const CUSTOM_ATTR = '@GTEL - GEIC'

/**
 * Basemap luôn hiện: CartoDB Voyager ở dưới, tile GEIC ở trên.
 * Khi server GEIC down (vd. HTTP 530), tile lỗi trong suốt → vẫn thấy CartoDB.
 * Sau ≥3 tileerror thì gỡ lớp GEIC (tránh request lỗi liên tục).
 */
export function addTileLayerWithFallback(mapObj: L.Map): L.TileLayer {
  L.tileLayer(FALLBACK_TILE_URL, {
    minZoom: 6,
    maxZoom: 19,
    attribution: FALLBACK_ATTR,
    subdomains: 'abcd',
  }).addTo(mapObj)

  let errorCount = 0
  let removed = false
  const customLayer = L.tileLayer(CUSTOM_TILE_URL, {
    minZoom: 6,
    maxZoom: 19,
    attribution: CUSTOM_ATTR,
  })
  customLayer.on('tileerror', () => {
    errorCount++
    if (errorCount >= 3 && !removed) {
      removed = true
      console.warn('[MapModule] Custom tile server lỗi, chuyển sang CartoDB Voyager')
      try {
        mapObj.removeLayer(customLayer)
      } catch {
        /* ignore */
      }
    }
  })
  customLayer.addTo(mapObj)
  return customLayer
}
