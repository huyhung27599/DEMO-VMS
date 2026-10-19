import { loadAlarms } from '../loaders'
import { useDashboardStore, type AlarmFeedItem } from '../store'
import { ChartCard } from './ChartCard'

const DOT: Record<AlarmFeedItem['sev'], string> = {
  critical: 'bg-[#ef4444]',
  warning: 'bg-[#f59e0b]',
  info: 'bg-[#3b82f6]',
}

export function AlarmFeed() {
  const items = useDashboardStore((s) => s.alarmItems)

  return (
    <ChartCard
      className="flex-1"
      icon="fa-bell"
      iconColor="#ef4444"
      title="Báo động gần đây"
      headerExtra={
        <button
          type="button"
          id="refresh-alarm-feed"
          title="Làm mới"
          aria-label="Làm mới báo động"
          onClick={() => void loadAlarms()}
          className="cursor-pointer rounded-md bg-[#efefef] px-[0.65rem] py-[0.3rem] text-xs font-semibold text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <i className="fa-solid fa-rotate-right"></i>
        </button>
      }
    >
      <ul id="alarm-feed-list" className="m-0 max-h-[220px] list-none overflow-y-auto p-0">
        {items.length === 0 ? (
          <li className="flex items-center justify-center gap-2 p-6 text-center text-[0.85rem] text-text-muted">
            <i className="fa-solid fa-circle-check text-[#10b981]"></i> Không có báo động mới
          </li>
        ) : (
          items.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-[0.6rem] border-b border-[#f1f5f9] px-3 py-[0.6rem] transition-colors duration-250 last:border-b-0 hover:bg-[rgba(239,68,68,0.03)]"
            >
              <div className={`mt-[0.3rem] size-2 shrink-0 rounded-full ${DOT[a.sev]}`}></div>
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden text-[0.78rem] font-semibold text-ellipsis whitespace-nowrap text-text-main">
                  {a.title}
                </div>
                <div className="mt-[0.1rem] text-[0.7rem] text-text-muted">{a.time}</div>
              </div>
            </li>
          ))
        )}
      </ul>
    </ChartCard>
  )
}
