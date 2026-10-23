import { REPORT_TYPES, type ReportTypeId } from '../mockData'
import {
  DEMO_DRIVING_ROWS,
  DEMO_SPEED_ROWS,
  DEMO_STOP_ROWS,
  DEMO_SUMMARY_ROWS,
  DEMO_TRIP_ROWS,
} from '../mockData'
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

function TripTable() {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="[&>th]:border-b [&>th]:border-[#eef2f6] [&>th]:bg-[#f8fafc] [&>th]:px-4 [&>th]:py-3 [&>th]:text-[0.7rem] [&>th]:font-bold [&>th]:tracking-[0.06em] [&>th]:text-[#94a3b8] [&>th]:uppercase">
          <th>Biển số</th>
          <th>Tài xế</th>
          <th>Bắt đầu</th>
          <th>Kết thúc</th>
          <th>Điểm đi</th>
          <th>Điểm đến</th>
          <th>Quãng đường</th>
        </tr>
      </thead>
      <tbody>
        {DEMO_TRIP_ROWS.map((r) => (
          <tr key={r.plate + r.start} className="[&>td]:border-b [&>td]:border-[#f1f5f9] [&>td]:px-4 [&>td]:py-3 [&>td]:text-[0.85rem] [&>td]:text-[#334155]">
            <td className="font-bold text-[#0f172a]">{r.plate}</td>
            <td>{r.driver}</td>
            <td className="tabular-nums">{r.start}</td>
            <td className="tabular-nums">{r.end}</td>
            <td>{r.from}</td>
            <td>{r.to}</td>
            <td className="font-semibold text-[#0f172a]">{r.distance}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GenericTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
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

function bodyFor(type: ReportTypeId) {
  switch (type) {
    case 'trips':
      return <TripTable />
    case 'speed':
      return (
        <GenericTable
          headers={['Biển số', 'Tài xế', 'TB', 'Max', 'Vượt tốc']}
          rows={DEMO_SPEED_ROWS.map((r) => [r.plate, r.driver, r.avg, r.max, r.over])}
        />
      )
    case 'driving':
      return (
        <GenericTable
          headers={['Biển số', 'Tài xế', 'Liên tục', 'Trong ngày', 'Vi phạm']}
          rows={DEMO_DRIVING_ROWS.map((r) => [r.plate, r.driver, r.continuous, r.dayTotal, r.violate])}
        />
      )
    case 'stops':
      return (
        <GenericTable
          headers={['Biển số', 'Tài xế', 'Thời điểm', 'Vị trí', 'Thời lượng']}
          rows={DEMO_STOP_ROWS.map((r) => [r.plate, r.driver, r.at, r.place, r.duration])}
        />
      )
    case 'summary':
      return (
        <GenericTable
          headers={['Biển số', 'Chuyến', 'Quãng đường', 'Vượt tốc', 'Cảnh báo AI']}
          rows={DEMO_SUMMARY_ROWS.map((r) => [r.plate, r.trips, r.distance, r.overSpeed, r.aiAlerts])}
        />
      )
    default:
      return null
  }
}

function rowCount(type: ReportTypeId): number {
  switch (type) {
    case 'trips':
      return DEMO_TRIP_ROWS.length
    case 'speed':
      return DEMO_SPEED_ROWS.length
    case 'driving':
      return DEMO_DRIVING_ROWS.length
    case 'stops':
      return DEMO_STOP_ROWS.length
    case 'summary':
      return DEMO_SUMMARY_ROWS.length
    default:
      return 0
  }
}

/** Bảng demo cho các loại báo cáo chưa có API (trừ Hành vi AI). */
export function MockReportTable({ type }: { type: Exclude<ReportTypeId, 'ai'> }) {
  const title = REPORT_TYPES.find((t) => t.id === type)?.title ?? 'Báo cáo'
  const n = rowCount(type)

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#eef2f6] px-5 py-4">
        <h3 className="m-0 text-[1rem] font-bold text-[#0f172a]">{title}</h3>
        <span className="text-[0.8rem] font-medium text-[#94a3b8]">
          <PeriodLabel />
        </span>
      </div>
      <div className="overflow-x-auto">{bodyFor(type)}</div>
      <div className="flex items-center justify-between gap-3 border-t border-[#eef2f6] px-5 py-3">
        <span className="text-[0.8rem] text-[#64748b]">Hiển thị {n} bản ghi</span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-[#94a3b8]">
            Trước
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#e11d48] text-[0.78rem] font-bold text-white">
            1
          </span>
          <span className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-[#94a3b8]">
            Sau
          </span>
        </div>
      </div>
    </div>
  )
}
