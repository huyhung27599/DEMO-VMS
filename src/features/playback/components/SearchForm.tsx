import { useQuery } from '@tanstack/react-query'
import { Button } from '../../../shared/ui/Button'
import type { Loose } from '../lib'
import { CAMERA_FILTER_OPTIONS } from '../mockData'
import { useSearchPlaybackMutation } from '../mutations'
import { playbackVehiclesQueryOptions } from '../queries'
import { usePlaybackStore } from '../store'

function VehicleOptions() {
  const enabled = usePlaybackStore((s) => s.vehicleDropdownEnabled)
  const query = useQuery(playbackVehiclesQueryOptions(enabled))
  if (!enabled) return <option value="">-- Chọn phương tiện --</option>
  if (query.isError) return <option value="">Lỗi tải danh sách</option>
  if (query.isPending) return <option value="">Đang tải...</option>
  return (
    <>
      <option value="">-- Chọn phương tiện --</option>
      {query.data.map((v: Loose, i: number) => (
        <option key={i} value={String(i)}>
          {String(v.nm || v.vehiIdno || `Xe ${i + 1}`)}
        </option>
      ))}
    </>
  )
}

function dateFromBegin(beginTime: string): string {
  if (!beginTime) return ''
  return beginTime.slice(0, 10)
}

function setDayRange(ymd: string): void {
  if (!ymd) {
    usePlaybackStore.setState({ beginTime: '', endTime: '' })
    return
  }
  usePlaybackStore.setState({
    beginTime: `${ymd}T00:00`,
    endTime: `${ymd}T23:59`,
  })
}

const SELECT =
  'h-[42px] min-w-[160px] flex-1 cursor-pointer rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm font-medium text-[#1e293b] outline-none focus:border-[#e11d48]/40 focus:ring-2 focus:ring-[#e11d48]/10'

export function SearchForm() {
  const vehicleValue = usePlaybackStore((s) => s.vehicleValue)
  const beginTime = usePlaybackStore((s) => s.beginTime)
  const initialized = usePlaybackStore((s) => s.initialized)
  const searching = usePlaybackStore((s) => s.searching)
  const cameraFilter = usePlaybackStore((s) => s.cameraFilter)
  const search = useSearchPlaybackMutation()

  return (
    <div className="header-actions w-full">
      <div className="pb-filters-synced flex flex-wrap items-center gap-3 rounded-2xl border border-[#eef2f6] bg-white p-3 shadow-sm">
        <div className="filter-item flex min-w-[180px] flex-1 flex-col gap-1">
          <label htmlFor="pb-vehicle-select" className="sr-only">
            Phương tiện
          </label>
          <select
            id="pb-vehicle-select"
            className={`pb-filter-select ${SELECT}`}
            value={vehicleValue}
            onChange={(e) => usePlaybackStore.setState({ vehicleValue: e.target.value })}
          >
            <VehicleOptions />
          </select>
        </div>

        <div className="filter-item flex min-w-[150px] flex-col gap-1">
          <label htmlFor="pb-date-input" className="sr-only">
            Ngày
          </label>
          <div className="relative">
            <i className="fa-regular fa-calendar pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#94a3b8]" aria-hidden />
            <input
              id="pb-date-input"
              type="date"
              className={`${SELECT} w-full pl-9`}
              value={dateFromBegin(beginTime)}
              onChange={(e) => setDayRange(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-item flex min-w-[140px] flex-col gap-1">
          <label htmlFor="pb-camera-filter" className="sr-only">
            Camera
          </label>
          <select
            id="pb-camera-filter"
            className={SELECT}
            value={cameraFilter}
            onChange={(e) => usePlaybackStore.setState({ cameraFilter: e.target.value })}
          >
            {CAMERA_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          id="pb-search-btn"
          className={`h-[42px] shrink-0 rounded-xl! bg-[#e11d48]! px-5! hover:bg-[#be123c]! ${searching ? 'loading' : ''}`}
          onClick={initialized ? () => search.mutate() : undefined}
        >
          {searching ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Đang tìm...
            </>
          ) : (
            <>
              <i className="fa-solid fa-magnifying-glass" aria-hidden /> Tìm kiếm
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/** index.html:979-983 — khoảng thời gian ẩn (giữ cho GPS / mặc định / test). */
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
