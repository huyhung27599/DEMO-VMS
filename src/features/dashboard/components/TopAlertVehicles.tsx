import { useDashboardStore } from '../store'

const RANK_BG = ['bg-[#e11d48]', 'bg-[#f97316]', 'bg-[#94a3b8]', 'bg-[#cbd5e1]', 'bg-[#cbd5e1]'] as const

export function TopAlertVehicles() {
  const rows = useDashboardStore((s) => s.topVehicles)

  return (
    <div className="flex min-h-[280px] flex-1 flex-col rounded-2xl border border-[#eef2f6] bg-white p-5 shadow-sm">
      <h3 className="mb-5 m-0 text-[0.95rem] font-semibold text-[#1e293b]">Top xe cảnh báo</h3>
      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-sm text-[#94a3b8]">Chưa có dữ liệu</div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.map((r) => (
            <li key={r.plate} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold text-white ${RANK_BG[r.rank - 1] ?? RANK_BG[4]}`}
              >
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.95rem] font-bold text-[#1e293b]">{r.plate}</div>
                <div className="truncate text-[0.78rem] text-[#94a3b8]">{r.driver}</div>
              </div>
              <span
                className={`shrink-0 text-[1.05rem] font-bold tabular-nums ${r.count > 0 ? 'text-[#e11d48]' : 'text-[#94a3b8]'}`}
              >
                {r.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
