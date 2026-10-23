import { Button } from '../../../shared/ui/Button'
import { loadStatistics, onCustomApplyClick } from '../loaders'
import { useStatisticsStore } from '../store'
import { DateFilter } from './DateFilter'

const SELECT =
  'h-[42px] min-w-[140px] flex-1 cursor-pointer rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm font-medium text-[#1e293b] outline-none focus:border-[#e11d48]/40 focus:ring-2 focus:ring-[#e11d48]/10'

function toDateInput(v: string): string {
  return v ? v.slice(0, 10) : ''
}

function setRangeFromDates(from: string, to: string): void {
  useStatisticsStore.setState({
    customStartInput: from ? `${from}T00:00` : '',
    customEndInput: to ? `${to}T23:59` : '',
    activeDateBtn: 'custom',
    customPickerVisible: true,
  })
}

/** Bộ lọc mockup + giữ DateFilter (preset / tùy chọn / apply) và refresh. */
export function ReportFilterBar() {
  const enterprise = useStatisticsStore((s) => s.reportEnterprise)
  const vehicle = useStatisticsStore((s) => s.reportVehicle)
  const startValue = useStatisticsStore((s) => s.customStartInput)
  const endValue = useStatisticsStore((s) => s.customEndInput)

  function onViewReport() {
    if (startValue && endValue) {
      onCustomApplyClick()
      return
    }
    void loadStatistics()
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#eef2f6] bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label htmlFor="stat-report-enterprise" className="sr-only">
            Doanh nghiệp
          </label>
          <select
            id="stat-report-enterprise"
            className={SELECT}
            value={enterprise}
            onChange={(e) => useStatisticsStore.setState({ reportEnterprise: e.target.value })}
          >
            <option value="">Tất cả doanh nghiệp</option>
            <option value="geic">GEIC</option>
            <option value="gtel">Gtel</option>
          </select>
        </div>
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label htmlFor="stat-report-vehicle" className="sr-only">
            Phương tiện
          </label>
          <select
            id="stat-report-vehicle"
            className={SELECT}
            value={vehicle}
            onChange={(e) => useStatisticsStore.setState({ reportVehicle: e.target.value })}
          >
            <option value="">Tất cả phương tiện</option>
            <option value="30M-81775">30M-81775</option>
            <option value="43C-11882">43C-11882</option>
          </select>
        </div>
        <div className="flex min-w-[260px] flex-[1.2] items-center gap-2">
          <input
            type="date"
            aria-label="Từ ngày"
            className={`${SELECT} flex-1`}
            value={toDateInput(startValue)}
            onChange={(e) => setRangeFromDates(e.target.value, toDateInput(endValue))}
          />
          <i className="fa-solid fa-arrow-right shrink-0 text-[#94a3b8]" aria-hidden />
          <input
            type="date"
            aria-label="Đến ngày"
            className={`${SELECT} flex-1`}
            value={toDateInput(endValue)}
            onChange={(e) => setRangeFromDates(toDateInput(startValue), e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          id="stat-view-report-btn"
          className="h-[42px] shrink-0 rounded-xl! bg-[#e11d48]! px-5! hover:bg-[#be123c]!"
          onClick={onViewReport}
        >
          <i className="fa-solid fa-magnifying-glass" aria-hidden /> Xem báo cáo
        </Button>
        <button
          type="button"
          id="stat-refresh-btn"
          title="Làm mới dữ liệu"
          aria-label="Làm mới dữ liệu"
          onClick={() => void loadStatistics()}
          className="flex size-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] transition hover:border-[#e11d48]/40 hover:text-[#e11d48]"
        >
          <i className="fa-solid fa-arrows-rotate" aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#f1f5f9] pt-2">
        <span className="text-[0.72rem] font-semibold tracking-wide text-[#94a3b8] uppercase">Kỳ nhanh</span>
        <DateFilter />
      </div>
    </div>
  )
}
