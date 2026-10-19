# Mapme POI (Option B) – Hướng dẫn tích hợp nhanh

Mục tiêu: **dùng Mapme để quản lý POI/nội dung tĩnh**, còn hệ thống Dashcam Admin Platform sẽ **tự hiển thị POI như 1 overlay layer** trên bản đồ realtime.

## Bản đồ 3D giống Mapme (quan trọng)

Ảnh “3D buildings” giống Mapme yêu cầu **vector tiles + style có lớp `building`** (MapLibre/Mapbox GL).

Trong repo hiện tại:

- **LiveView map** (`liveview-map`) vẫn dùng Leaflet (nhẹ, ổn định cho giám sát).
- **Tab “Bản đồ trực tuyến”** (`map-container`) đã chuyển sang **MapLibre GL** để hỗ trợ 3D.

### Cấu hình style/tiles cho MapLibre (để ra đúng như ảnh)

Mặc định app dùng style demo:

- `https://demotiles.maplibre.org/styles/osm-bright-gl-style/style.json`

Style demo này có thể **không có dữ liệu ở Việt Nam**. Để hiển thị đầy đủ (VN + buildings), bạn cần cung cấp 1 style URL từ:

- MapTiler / Mapbox (có API key), hoặc
- Tự host OpenMapTiles (vector tile server) + style.json.

Chỉ cần set:

```html
<script>
  window.MAP_GL_STYLE_URL = "https://YOUR_STYLE/style.json";
</script>
```

Đặt đoạn này **trước khi load** `js/map.js`.

### 1) File POI mặc định

Ứng dụng sẽ tự tải POI từ:

- `frontend/data/mapme-pois.geojson`

Định dạng yêu cầu: **GeoJSON FeatureCollection** với các feature kiểu **Point**.

Ví dụ:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "title": "Kho A",
        "category": "Kho/Bãi",
        "description": "Ghi chú..."
      },
      "geometry": { "type": "Point", "coordinates": [108.20623, 16.047079] }
    }
  ]
}
```

### 2) Trỏ sang nguồn POI khác (host riêng)

Nếu bạn muốn đặt file GeoJSON ở URL khác, chỉ cần set biến global:

```html
<script>
  window.MAPME_POI_URL = "data/mapme-pois.geojson"; // hoặc https://.../pois.geojson
</script>
```

Gợi ý: đặt đoạn này trước khi load `js/mapme-poi.js`.

### 3) UI trên bản đồ

Trên map sẽ có một control **POI (Mapme)**:

- Bật/tắt overlay
- Lọc theo `category`
- Nút reload (tải lại file GeoJSON)
