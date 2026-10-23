import { useMapStore } from './store'
import { mapController } from './mapController'

const BASE =
  'map-container relative h-full min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-solid border-[#e2e8f0] bg-[#e8eef4] shadow-sm'

type Props = {
  /** Bản đồ nào trong singleton: #map-container (main) hay #liveview-map (liveView) */
  target: 'main' | 'liveView'
  /** Chữ trong .map-placeholder trước khi init (index.html) */
  placeholder: string
  /** Lớp thêm (cố định — Leaflet tự thêm class vào phần tử, không được đổi className khi render lại) */
  className?: string
}

// .map-container / .map-placeholder (styles2.css:1737-1754). Leaflet gắn bản đồ vào div này;
// placeholder là con do React quản lý, gỡ khi MapModule đã init (bản gốc: innerHTML = '').
export function MapContainer({ target, placeholder, className = '' }: Props) {
  const initialized = useMapStore((s) => s.isInitialized)
  return (
    <div
      id={target === 'main' ? 'map-container' : 'liveview-map'}
      className={`${BASE} ${className}`}
      ref={(el) => {
        if (el) mapController.attach(target === 'main' ? { main: el } : { liveView: el })
      }}
    >
      {initialized ? null : (
        <div className="map-placeholder flex h-full items-center justify-center font-medium text-text-muted">
          {placeholder}
        </div>
      )}
    </div>
  )
}
