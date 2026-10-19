import { useNavigate } from '@tanstack/react-router'
import { onVehicleSearch } from '../loaders'
import { useDashboardStore, type VehicleRow } from '../store'
import { ChartCard } from './ChartCard'

// .veh-status-badge + .veh-status-{offline,moving,parked} (styles2.css:2614-2642)
const BADGE_CLASS: Record<VehicleRow['badge']['kind'], string> = {
  offline: 'bg-[rgba(100,116,139,0.12)] text-[#64748b]',
  moving: 'bg-[rgba(59,130,246,0.12)] text-[#2563eb]',
  parked: 'bg-[rgba(245,158,11,0.12)] text-[#d97706]',
}

const TH =
  'sticky top-0 border-b border-border bg-[#f8fafc] px-[0.65rem] py-2 text-left text-[0.72rem] font-semibold tracking-[0.04em] text-text-muted uppercase'
const TD = 'border-b border-[#f1f5f9] px-[0.65rem] py-2 text-text-main group-last:border-b-0 group-hover:bg-primary/4'

export function LiveVehiclesPanel() {
  const navigate = useNavigate()
  const rows = useDashboardStore((s) => s.tableRows)
  const count = useDashboardStore((s) => s.tableCount)
  const searchText = useDashboardStore((s) => s.searchText)

  return (
    <ChartCard
      className="min-h-0 flex-[1.5]"
      icon="fa-satellite-dish"
      iconColor="#2a9dd8"
      title="Giám sát trực tiếp"
      headerExtra={
        <span className="flex items-center gap-[0.4rem] text-[0.65rem] font-bold tracking-[0.05em] text-[#ef4444]">
          <span className="dashboard-pulse-live inline-block size-2 shrink-0 rounded-full bg-[#ef4444]"></span>LIVE
        </span>
      }
    >
      <div className="mb-3 flex items-center gap-2 rounded-sm border border-border bg-[#f8fafc] px-3 py-[0.4rem] text-[0.85rem] text-text-muted focus-within:outline-2 focus-within:outline-primary">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          id="dash-vehicle-search"
          aria-label="Tìm biển số xe"
          placeholder="Tìm biển số xe..."
          value={searchText}
          onChange={(e) => onVehicleSearch(e.target.value)}
          className="flex-1 border-none bg-transparent font-sans text-[0.82rem] text-text-main outline-none"
        />
      </div>
      <div className="max-h-[260px] flex-1 overflow-y-auto rounded-sm border border-border">
        <table className="w-full border-collapse text-[0.8rem]">
          <thead>
            <tr>
              <th className={TH}>Biển số</th>
              <th className={TH}>Trạng thái</th>
            </tr>
          </thead>
          <tbody id="live-vehicles-tbody">
            {rows === null ? (
              <tr className="live-vehicles-loading">
                <td colSpan={4} className="p-6 text-center text-text-muted">
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-6 text-center text-text-muted">
                  Không tìm thấy phương tiện
                </td>
              </tr>
            ) : (
              rows.map((v, i) => (
                <tr key={i} className="group">
                  <td className={`${TD} text-[0.78rem] font-semibold`}>{v.plate}</td>
                  <td className={TD}>
                    <span
                      className={`inline-flex items-center gap-[0.3rem] rounded-full px-[0.45rem] py-[0.15rem] text-[0.7rem] font-semibold ${BADGE_CLASS[v.badge.kind]}`}
                    >
                      {v.badge.label}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-[0.6rem] flex items-center justify-between text-xs text-text-muted">
        <span id="live-vehicles-count">{count}</span>
        {/* dash-view-all-btn: bản gốc click vào nav-item liveview */}
        <button
          type="button"
          id="dash-view-all-btn"
          onClick={() => void navigate({ to: '/liveview' })}
          className="cursor-pointer border-none bg-transparent p-0 font-sans text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Xem tất cả →
        </button>
      </div>
    </ChartCard>
  )
}
