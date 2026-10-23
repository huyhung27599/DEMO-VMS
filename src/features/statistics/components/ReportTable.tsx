import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { REPORT_TYPES, type ReportTypeId } from '../mockData'
import { reportQueryOptions } from '../reports'
import { useStatisticsStore } from '../store'

function PeriodLabel() {
  const start = useStatisticsStore((s) => s.customStartInput)
  const end = useStatisticsStore((s) => s.customEndInput)
  const days = useStatisticsStore((s) => s.currentPeriod)
  if (start && end) {
    const a = start.slice(0, 10).split('-').reverse().join('/')
    const b = end.slice(0, 10).split('-').reverse().join('/')
    return <>Kỳ: {a} – {b}</>
  }
  if (days === 1) return <>Kỳ: Hôm nay</>
  return <>Kỳ: {days} ngày gần nhất</>
}

function GenericTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="[&>th]:border-b [&>th]:border-[#eef2f6] [&>th]:bg-[#f8fafc] [&>th]:px-4 [&>th]:py-3 [&>th]:text-[0.7rem] [&>th]:font-bold [&>th]:tracking-[0.06em] [&>th]:text-[#94a3b8] [&>th]:uppercase">
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="[&>td]:border-b [&>td]:border-[#f1f5f9] [&>td]:px-4 [&>td]:py-3 [&>td]:text-[0.85rem] [&>td]:text-[#334155]">
            {cells.map((c, j) => (
              <td key={j} className={j === 0 ? 'font-bold text-[#0f172a]' : ''}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Báo cáo QCVN (trừ Hành vi AI) — dữ liệu thật từ runMileage / queryAlarmDetail / parkDetail (reports.ts). */
export function ReportTable({ type }: { type: Exclude<ReportTypeId, 'ai'> }) {
  const title = REPORT_TYPES.find((t) => t.id === type)?.title ?? 'Báo cáo'
  const enterprise = useStatisticsStore((s) => s.reportEnterprise)
  const vehicle = useStatisticsStore((s) => s.reportVehicle)
  const isCustomDate = useStatisticsStore((s) => s.isCustomDate)
  const customStartDate = useStatisticsStore((s) => s.customStartDate)
  const customEndDate = useStatisticsStore((s) => s.customEndDate)
  const currentPeriod = useStatisticsStore((s) => s.currentPeriod)
  // lastUpdate đổi mỗi lần loadStatistics (Xem báo cáo / làm mới) → chạy lại báo cáo
  const nonce = useStatisticsStore((s) => s.lastUpdate)

  const range = useMemo(() => {
    if (isCustomDate && customStartDate && customEndDate) return { start: customStartDate, end: customEndDate }
    const end = new Date()
    return { start: new Date(end.getTime() - currentPeriod * 86_400_000), end }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomDate, customStartDate, customEndDate, currentPeriod, nonce])

  const options = useStatisticsStore((s) => s.reportOptions)
  const report = useQuery(reportQueryOptions({ type, ...range, enterprise, vehicle, nonce: String(nonce) }, options))
  const rows = report.data?.rows ?? []

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#eef2f6] px-5 py-4">
        <h3 className="m-0 text-[1rem] font-bold text-[#0f172a]">{title}</h3>
        <span className="text-[0.8rem] font-medium text-[#94a3b8]">
          <PeriodLabel />
        </span>
      </div>
      <div className="overflow-x-auto">
        <GenericTable headers={report.data?.headers ?? []} rows={rows} />
        {report.isFetching || !options ? (
          <div className="p-6 text-center text-[0.85rem] text-[#64748b]">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Đang tải báo cáo...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-[0.85rem] text-[#94a3b8]">Không có dữ liệu trong kỳ</div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#eef2f6] px-5 py-3">
        <span className="text-[0.8rem] text-[#64748b]">Hiển thị {rows.length} bản ghi</span>
      </div>
    </div>
  )
}
