import L from 'leaflet'
import './map.css'

type FeatureProps = { name?: string; name_en?: string; description?: string }

/** map.js:16-60 — vùng lãnh thổ (Hoàng Sa, Trường Sa, Biển Đông) + nhãn đặc khu. */
export function addTerritorialOverlays(m: L.Map): void {
  // Đường dẫn tuyệt đối như bản gốc (public/*.geojson)
  const overlays = [
    { url: '/hoangsa.geojson', color: '#3498db' },
    { url: '/truongsa.geojson', color: '#27ae60' },
    { url: '/biendong.geojson', color: '#e74c3c' },
  ]
  overlays.forEach((def) => {
    fetch(def.url)
      .then((r) => r.json())
      .then((geojson) => {
        L.geoJSON(geojson, {
          style: (feature) => (feature?.geometry.type === 'Point' ? {} : { weight: 0, fillOpacity: 0, opacity: 0 }),
          pointToLayer: (_feature, latlng) => {
            const dL = 0.035
            const shape: L.LatLngTuple[] = [
              [latlng.lat + dL * 0.9, latlng.lng + dL * 0.2],
              [latlng.lat + dL * 0.5, latlng.lng + dL * 0.8],
              [latlng.lat - dL * 0.3, latlng.lng + dL * 0.7],
              [latlng.lat - dL * 0.8, latlng.lng + dL * 0.1],
              [latlng.lat - dL * 0.5, latlng.lng - dL * 0.6],
              [latlng.lat + dL * 0.2, latlng.lng - dL * 0.8],
              [latlng.lat + dL * 0.8, latlng.lng - dL * 0.5],
            ]
            return L.polygon(shape, {
              weight: 0.5,
              color: '#e0d6bd',
              fillColor: '#f2efe9',
              fillOpacity: 1,
              interactive: false,
            })
          },
          onEachFeature: (feature, layer) => {
            const p: FeatureProps = feature.properties || {}
            if (p.name) {
              // Chuỗi HTML ghép thẳng từ file geojson tĩnh như bản gốc
              let popup = `<b>${p.name}</b>`
              if (p.name_en) popup += `<br><i>${p.name_en}</i>`
              if (p.description) popup += `<br><small>${p.description}</small>`
              layer.bindPopup(popup)
            }
          },
        }).addTo(m)
      })
      .catch((e) => console.warn('GeoJSON lỗi:', def.url, e))
  })

  const lbl = (lat: number, lng: number, html: string, cls: string) => {
    const marker = L.circleMarker([lat, lng], { radius: 0, opacity: 0, fillOpacity: 0, interactive: false })
    marker.bindTooltip(html, { permanent: true, direction: 'center', className: cls, opacity: 1 }).addTo(m)
  }
  lbl(
    16.5,
    112.2,
    '<div class="map-text island-text"><div class="igl-main">Đặc Khu Hoàng Sa</div><div class="igl-sub">(Đà Nẵng - Việt Nam)</div></div>',
    'island-label-wrapper',
  )
  lbl(
    10.0,
    114.5,
    '<div class="map-text island-text"><div class="igl-main">Đặc Khu Trường Sa</div><div class="igl-sub">(Khánh Hòa - Việt Nam)</div></div>',
    'island-label-wrapper',
  )
}
