import type { Loose } from '../lib'
import { onVehicleChange } from '../actions'
import { useLiveviewStore, type VehicleOptionsView } from '../store'

// index.html:858-863 #liveview-vehicle-select; option do loadVehicleDropdown (liveview.js:1043-1069) dựng.

function VehicleOptions({ view }: { view: VehicleOptionsView }) {
  if (view.kind === 'error') return <option value="">Lỗi tải danh sách</option>
  if (view.kind === 'initial') return <option value="">Chọn phương tiện</option>
  return (
    <>
      <option value="">Chọn phương tiện...</option>
      {view.vehicles.map((vehicle: Loose, cacheIndex: number) => (
        // bản gốc: sanitizeHTML(nm) chèn qua innerHTML -> hiển thị đúng chuỗi gốc; JSX tự escape
        <option key={cacheIndex} value={String(cacheIndex)}>
          {String(vehicle?.nm || 'Unknown Vehicle')}
        </option>
      ))}
    </>
  )
}

export function VehicleList() {
  const view = useLiveviewStore((s) => s.vehicleOptions)
  const value = useLiveviewStore((s) => s.vehicleValue)
  return (
    <div className="search-with-icon relative">
      <select
        id="liveview-vehicle-select"
        aria-label="Chọn phương tiện"
        className="liveview-filter-select min-w-[200px]"
        value={value}
        onChange={(e) => onVehicleChange(e.target.value)}
      >
        <VehicleOptions view={view} />
      </select>
    </div>
  )
}
