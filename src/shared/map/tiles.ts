import L from 'leaflet'

// map.js:62-66 — tile layer với tự động chuyển sang server dự phòng
export const CUSTOM_TILE_URL = 'https://map.geicdashcam.cloud/tiles/tile/{z}/{x}/{y}.png'
export const FALLBACK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
export const FALLBACK_ATTR = '@GTEL - GEIC'
export const CUSTOM_ATTR = '@GTEL - GEIC'

/** map.js:79-97 `_addTileLayerWithFallback`. Trả về lớp tile riêng (bản gốc không trả gì). */
export function addTileLayerWithFallback(mapObj: L.Map): L.TileLayer {
  let errorCount = 0
  const customLayer = L.tileLayer(CUSTOM_TILE_URL, {
    minZoom: 6,
    maxZoom: 19,
    attribution: CUSTOM_ATTR,
  })
  customLayer.on('tileerror', () => {
    errorCount++
    // Nếu 3+ tiles lỗi → tile server đang down → chuyển sang fallback
    // (bản gốc: mỗi lỗi sau đó lại thêm một lớp fallback nữa — giữ nguyên)
    if (errorCount >= 3) {
      console.warn('[MapModule] Custom tile server lỗi, chuyển sang CartoDB Voyager')
      mapObj.removeLayer(customLayer)
      L.tileLayer(FALLBACK_TILE_URL, {
        minZoom: 6,
        maxZoom: 19,
        attribution: FALLBACK_ATTR,
        subdomains: 'abcd',
      }).addTo(mapObj)
    }
  })
  customLayer.addTo(mapObj)
  return customLayer
}
