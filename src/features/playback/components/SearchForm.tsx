import { useQuery } from '@tanstack/react-query'
import { Button } from '../../../shared/ui/Button'
import type { Loose } from '../lib'
import { useSearchPlaybackMutation } from '../mutations'
import { playbackVehiclesQueryOptions } from '../queries'
import { usePlaybackStore } from '../store'

// index.html:964-976 (.header-actions > .pb-filters-synced) + 979-983 (input thời gian ẩn).
// Option của #pb-vehicle-select do loadVehicleDropdown (playback.js:477-493) dựng.

function VehicleOptions() {
  const enabled = usePlaybackStore((s) => s.vehicleDropdownEnabled)
  const query = useQuery(playbackVehiclesQueryOptions(enabled))
  // index.html (trước init)
  if (!enabled) return <option value="">-- Chọn phương tiện --</option>
  if (query.isError) return <option value="">Lỗi tải danh sách</option>
  if (query.isPending) return <option value="">Đang tải...</option>
  return (
    <>
      <option value="">-- Chọn phương tiện --</option>
      {query.data.map((v: Loose, i: number) => (
        // bản gốc: sanitizeHTML(...) chèn qua innerHTML -> hiển thị đúng chuỗi gốc; JSX tự escape
        <option key={i} value={String(i)}>
          {String(v.nm || v.vehiIdno || `Xe ${i + 1}`)}
        </option>
      ))}
    </>
  )
}

export function SearchForm() {
  const vehicleValue = usePlaybackStore((s) => s.vehicleValue)
  const initialized = usePlaybackStore((s) => s.initialized)
  const searching = usePlaybackStore((s) => s.searching)
  const search = useSearchPlaybackMutation()

  return (
    <div className="header-actions flex items-center gap-4">
      <div className="pb-filters-synced flex flex-wrap items-end gap-4">
        <div className="filter-item flex flex-col gap-[0.35rem]">
          <label
            htmlFor="pb-vehicle-select"
            className="filter-label text-[0.72rem] font-semibold tracking-[0.04em] text-text-muted uppercase"
          >
            Phương tiện
          </label>
          <select
            id="pb-vehicle-select"
            className="pb-filter-select min-w-[180px]"
            value={vehicleValue}
            onChange={(e) => usePlaybackStore.setState({ vehicleValue: e.target.value })}
          >
            <VehicleOptions />
          </select>
        </div>
        <Button
          variant="primary"
          id="pb-search-btn"
          className={`mt-auto h-[38px] ${searching ? 'loading' : ''}`}
          // bindEvents (playback.js:414-416): listener chỉ được gắn trong init()
          onClick={initialized ? () => search.mutate() : undefined}
        >
          {searching ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang tìm...
            </>
          ) : (
            <>
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Tìm kiếm
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/** index.html:979-983 — khoảng thời gian ẩn (giữ cho GPS / mặc định). */
export function HiddenTimeRange() {
  const beginTime = usePlaybackStore((s) => s.beginTime)
  const endTime = usePlaybackStore((s) => s.endTime)
  return (
    <div hidden>
      <input
        type="datetime-local"
        id="pb-begin-time"
        aria-label="Thời gian bắt đầu"
        value={beginTime}
        onChange={(e) => usePlaybackStore.setState({ beginTime: e.target.value })}
      />
      <input
        type="datetime-local"
        id="pb-end-time"
        aria-label="Thời gian kết thúc"
        value={endTime}
        onChange={(e) => usePlaybackStore.setState({ endTime: e.target.value })}
      />
    </div>
  )
}
