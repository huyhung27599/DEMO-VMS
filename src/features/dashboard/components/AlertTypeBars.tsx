import { useDashboardStore } from '../store'

export function AlertTypeBars() {
  const bars = useDashboardStore((s) => s.alarmTypeBars)
  const max = bars.reduce((m, b) => Math.max(m, b.count), 0) || 1

  return (
    <div className="flex min-h-[280px] flex-1 flex-col rounded-2xl border border-[#eef2f6] bg-white p-5 shadow-sm">
      <h3 className="mb-5 m-0 text-[0.95rem] font-semibold text-[#1e293b]">Cảnh báo theo loại (hôm nay)</h3>
      {bars.length === 0 ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-10 text-sm text-[#94a3b8]">
          <i className="fa-solid fa-circle-check text-[#10b981]" aria-hidden />
          Không có cảnh báo hôm nay
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col justify-center gap-4 p-0">
          {bars.map((b) => (
            <li
              key={b.name}
              className="grid grid-cols-[6.75rem_1fr_2.75rem] items-center gap-3 max-[480px]:grid-cols-[5.25rem_1fr_2.25rem]"
            >
              <span className="truncate text-[0.82rem] font-medium text-[#334155]" title={b.name}>
                {b.name}
              </span>
              <div className="h-3.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(8, (b.count / max) * 100)}%`, backgroundColor: b.color }}
                />
              </div>
              <span className="text-right text-[0.85rem] font-bold tabular-nums text-[#1e293b]">{b.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
