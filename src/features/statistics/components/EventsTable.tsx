import { Button } from '../../../shared/ui/Button'
import { eventDateStr, formatSpeedDisplay, getApiSeverity, getViolationDisplayName, type AnyRow } from '../lib'
import { onExportClick, onFilterTypeChange, onNextClick, onPrevClick, onSearchInput, openEventModal } from '../loaders'
import { useStatisticsStore } from '../store'

// .card.stat-table-card (index.html:1220-1270, statistics.css:56-82, styles2.css:762-777)

const CONTROL =
  'h-8 rounded-sm border border-border px-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary'

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
    <tr className="stat-events-row" onClick={() => openEventModal(e, dateStr)}>
      <td>{dateStr}</td>
      <td className="font-medium">{e.vehicleName}</td>
      <td>
        <span className="rounded-sm bg-black/5 px-2 py-1 text-[0.85rem] font-semibold text-[#333]">{typeName}</span>
      </td>
      <td>
        <strong style={{ color: severityObj ? severityColor : '#64748b' }}>{severity}</strong>
      </td>
      <td>{spd}</td>
      <td>{lat !== '--' ? `${lat}, ${lng}` : '--'}</td>
      <td>
        {/* Không có handler riêng: click (kể cả Enter/Space khi focus) nổi lên tr như bản gốc */}
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
    <div className="mb-6 flex flex-1 flex-col rounded-md border border-[rgba(226,232,240,0.8)] bg-base p-6 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[1.1rem] font-semibold">
          <i className="fa-solid fa-list-ul" aria-hidden="true"></i> Chi tiết sự kiện vi phạm
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            id="stat-table-search"
            aria-label="Tìm biển số xe"
            placeholder="Tìm biển số xe..."
            className={`${CONTROL} w-50`}
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
          <Button id="stat-export-btn" variant="primary" size="sm" onClick={onExportClick}>
            <i className="fa-solid fa-download" aria-hidden="true"></i> CSV
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="stat-events-table">
          <thead>
            <tr>
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
                <td colSpan={7} className="text-center">
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang tải dữ liệu...
                </td>
              </tr>
            ) : table.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-text-muted!">
                  Không có dữ liệu phù hợp bộ lọc
                </td>
              </tr>
            ) : (
              table.items.map((e, i) => <EventRow key={i} e={e} />)
            )}
          </tbody>
        </table>
        <div className="mt-4 text-right">
          <Button id="stat-events-prev" size="sm" disabled={table === null ? true : table.prevDisabled} onClick={onPrevClick}>
            Trước
          </Button>
          <span id="stat-events-page-info" className="mx-2.5 text-[0.9rem]">
            {table === null ? 'Trang 1' : `Trang ${table.page} / ${table.totalPages}`}
          </span>
          <Button id="stat-events-next" size="sm" disabled={table === null ? false : table.nextDisabled} onClick={onNextClick}>
            Sau
          </Button>
        </div>
      </div>
    </div>
  )
}
