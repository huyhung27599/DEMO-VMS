import { Button } from '../../../shared/ui/Button'
import { eventDateStr, formatSpeedDisplay, getApiSeverity, getViolationDisplayName, type AnyRow } from '../lib'
import { onExportClick, onFilterTypeChange, onNextClick, onPrevClick, onSearchInput, openEventModal } from '../loaders'
import { useStatisticsStore } from '../store'

// .card.stat-table-card (index.html:1220-1270, statistics.css:56-82, styles2.css:762-777)

const CONTROL =
  'h-9 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm outline-none focus:border-[#e11d48]/40 focus:ring-2 focus:ring-[#e11d48]/10'

function EventRow({ e }: { e: AnyRow }) {
  const dateStr = eventDateStr(e)
  const typeName = e.displayName || getViolationDisplayName(e)

  const severityObj = getApiSeverity(e)
  const severity = severityObj ? severityObj.text : '--'
  const severityColor = severityObj ? severityObj.color : '#64748b'

  const lat = Number.isFinite(e.lat) ? Number(e.lat).toFixed(5) : '--'
  const lng = Number.isFinite(e.lng) ? Number(e.lng).toFixed(5) : '--'
  const spd = formatSpeedDisplay(e)

  return (
    <tr className="stat-events-row cursor-pointer hover:bg-[#fff8f9]" onClick={() => openEventModal(e, dateStr)}>
      <td>{dateStr}</td>
      <td className="font-bold text-[#0f172a]">{e.vehicleName}</td>
      <td>
        <span className="rounded-lg bg-[#f1f5f9] px-2 py-1 text-[0.8rem] font-semibold text-[#334155]">{typeName}</span>
      </td>
      <td>
        <strong style={{ color: severityObj ? severityColor : '#64748b' }}>{severity}</strong>
      </td>
      <td>{spd}</td>
      <td>{lat !== '--' ? `${lat}, ${lng}` : '--'}</td>
      <td>
        <Button size="sm" className="bg-primary! px-2! py-[0.2rem]! text-white!">
          <i className="fa-solid fa-play" aria-hidden="true"></i> Xem
        </Button>
      </td>
    </tr>
  )
}

export function EventsTable() {
  const table = useStatisticsStore((s) => s.table)
  const filterType = useStatisticsStore((s) => s.filterType)
  const search = useStatisticsStore((s) => s.search)

  return (
    <div className="mb-2 flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f6] px-5 py-4">
        <div className="flex items-center gap-2 text-[1rem] font-bold text-[#0f172a]">
          <i className="fa-solid fa-brain text-[#e11d48]" aria-hidden="true"></i> Hành vi AI
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            id="stat-table-search"
            aria-label="Tìm biển số xe"
            placeholder="Tìm biển số xe..."
            className={`${CONTROL} w-44`}
            value={search}
            onChange={(e) => onSearchInput(e.target.value)}
          />
          <select
            id="stat-table-filter-type"
            aria-label="Lọc loại vi phạm"
            className={CONTROL}
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value)}
          >
            <option value="ALL">Tất cả lỗi</option>
            <option value="620">Nghe điện thoại (620)</option>
            <option value="622">Hút thuốc (622)</option>
            <option value="624">Mất tập trung (624)</option>
            <option value="618">Lái xe mệt mỏi (618)</option>
            <option value="190">Ngáp (190)</option>
          </select>
          <Button id="stat-export-btn" variant="primary" size="sm" className="rounded-xl!" onClick={onExportClick}>
            <i className="fa-solid fa-download" aria-hidden="true"></i> CSV
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto px-1">
        <table className="stat-events-table w-full border-collapse text-left">
          <thead>
            <tr className="[&>th]:border-b [&>th]:border-[#eef2f6] [&>th]:bg-[#f8fafc] [&>th]:px-4 [&>th]:py-3 [&>th]:text-[0.7rem] [&>th]:font-bold [&>th]:tracking-[0.06em] [&>th]:text-[#94a3b8] [&>th]:uppercase">
              <th>Thời gian</th>
              <th>Biển số xe</th>
              <th>Lỗi vi phạm</th>
              <th>Mức độ</th>
              <th>Tốc độ lúc vi phạm</th>
              <th>Tọa độ GPS</th>
              <th>Bằng chứng</th>
            </tr>
          </thead>
          <tbody id="stat-events-tbody">
            {table === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#64748b]">
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang tải dữ liệu...
                </td>
              </tr>
            ) : table.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted!">
                  Không có dữ liệu phù hợp bộ lọc
                </td>
              </tr>
            ) : (
              table.items.map((e, i) => <EventRow key={i} e={e} />)
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#eef2f6] px-5 py-3">
        <span className="text-[0.8rem] text-[#64748b]" id="stat-events-page-info">
          {table === null ? 'Trang 1' : `Trang ${table.page} / ${table.totalPages}`}
        </span>
        <div className="flex items-center gap-1.5">
          <Button id="stat-events-prev" size="sm" disabled={table === null ? true : table.prevDisabled} onClick={onPrevClick}>
            Trước
          </Button>
          <Button id="stat-events-next" size="sm" disabled={table === null ? false : table.nextDisabled} onClick={onNextClick}>
            Sau
          </Button>
        </div>
      </div>
    </div>
  )
}
