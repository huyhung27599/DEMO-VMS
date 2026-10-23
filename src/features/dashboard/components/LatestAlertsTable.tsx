import { alertLevelLabel } from '../lib'
import { useDashboardStore, type AlertLevel } from '../store'

const LEVEL_CLASS: Record<AlertLevel, string> = {
  high: 'font-semibold text-[#e11d48]',
  medium: 'font-semibold text-[#d97706]',
  low: 'font-semibold text-[#64748b]',
}

export function LatestAlertsTable() {
  const rows = useDashboardStore((s) => s.latestAlerts)

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
      <div className="border-b border-[#eef2f6] px-5 py-4">
        <h3 className="m-0 text-[0.95rem] font-semibold text-[#1e293b]">Cảnh báo mới nhất</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-[#eef2f6] text-[0.68rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase">
              <th className="px-5 py-3.5 font-bold">Thời gian</th>
              <th className="px-4 py-3.5 font-bold">Phương tiện</th>
              <th className="px-4 py-3.5 font-bold">Tài xế</th>
              <th className="px-4 py-3.5 font-bold">Loại cảnh báo</th>
              <th className="px-5 py-3.5 font-bold">Mức độ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[#94a3b8]">
                  <i className="fa-solid fa-circle-check mr-2 text-[#10b981]" aria-hidden />
                  Không có cảnh báo mới
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[#f1f5f9] last:border-b-0">
                  <td className="px-5 py-3.5 font-medium tabular-nums text-[#1e293b]">{r.time}</td>
                  <td className="px-4 py-3.5 font-semibold text-[#1e293b]">{r.plate}</td>
                  <td className="px-4 py-3.5 text-[#64748b]">{r.driver}</td>
                  <td className="px-4 py-3.5 text-[#334155]">{r.type}</td>
                  <td className={`px-5 py-3.5 ${LEVEL_CLASS[r.level]}`}>{alertLevelLabel(r.level)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
