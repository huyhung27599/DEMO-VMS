import { Button } from '../../../shared/ui/Button'
import { onCustomApplyClick, onCustomBtnClick, onDateBtnClick } from '../loaders'
import { useStatisticsStore } from '../store'

// #stat-date-filter-group (index.html:1102-1112): .date-filter-group + .dash-date-btn (styles2.css:2192-2219)
const DATE_BTN =
  'cursor-pointer rounded-[6px] border-none bg-transparent px-[0.85rem] py-[0.35rem] font-sans text-[0.8rem] font-medium text-text-muted transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-primary [&.active]:bg-white [&.active]:font-semibold [&.active]:text-primary [&.active]:shadow-[0_1px_3px_rgba(0,0,0,0.12)]'

const DATE_BTNS = [
  { days: 1, label: 'Hôm nay' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
] as const

export function DateFilter() {
  const active = useStatisticsStore((s) => s.activeDateBtn)
  const pickerVisible = useStatisticsStore((s) => s.customPickerVisible)
  const startValue = useStatisticsStore((s) => s.customStartInput)
  const endValue = useStatisticsStore((s) => s.customEndInput)

  return (
    <div
      id="stat-date-filter-group"
      className="flex flex-wrap items-center gap-2 rounded-md bg-[#f1f5f9] p-[3px]"
    >
      {DATE_BTNS.map((b) => (
        <button
          key={b.days}
          type="button"
          data-days={b.days}
          className={`${DATE_BTN} ${active === b.days ? 'active' : ''}`}
          aria-pressed={active === b.days}
          onClick={() => onDateBtnClick(b.days)}
        >
          {b.label}
        </button>
      ))}
      <button
        type="button"
        id="stat-custom-date-btn"
        className={`${DATE_BTN} ${active === 'custom' ? 'active' : ''}`}
        aria-pressed={active === 'custom'}
        onClick={onCustomBtnClick}
      >
        <i className="fa-regular fa-calendar" aria-hidden="true"></i> Tùy chọn
      </button>
      <div
        id="stat-custom-date-picker"
        className="ml-2 items-center gap-2"
        style={{ display: pickerVisible ? 'flex' : 'none' }}
      >
        <input
          type="datetime-local"
          id="stat-custom-start"
          aria-label="Thời gian bắt đầu"
          className="stat-filter-select"
          value={startValue}
          onChange={(e) => useStatisticsStore.setState({ customStartInput: e.target.value })}
        />
        <span>-</span>
        <input
          type="datetime-local"
          id="stat-custom-end"
          aria-label="Thời gian kết thúc"
          className="stat-filter-select"
          value={endValue}
          onChange={(e) => useStatisticsStore.setState({ customEndInput: e.target.value })}
        />
        <Button
          id="stat-custom-apply-btn"
          variant="primary"
          size="sm"
          className="h-8"
          aria-label="Áp dụng"
          title="Áp dụng"
          onClick={onCustomApplyClick}
        >
          <i className="fa-solid fa-filter" aria-hidden="true"></i>
        </Button>
      </div>
    </div>
  )
}
