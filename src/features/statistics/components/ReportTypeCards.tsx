import { startTransition } from 'react'
import { REPORT_TYPES, type ReportTypeId } from '../mockData'
import { useStatisticsStore } from '../store'

export function ReportTypeCards() {
  const active = useStatisticsStore((s) => s.reportType)

  return (
    <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
      {REPORT_TYPES.map((t, i) => {
        const selected = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => startTransition(() => useStatisticsStore.setState({ reportType: t.id as ReportTypeId }))}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 ${
              selected
                ? 'border-[#e11d48] ring-1 ring-[#e11d48]/25'
                : 'border-[#eef2f6] hover:border-[#f5c2c9]'
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-[1.05rem] ${
                selected ? 'bg-[#e11d48] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
              }`}
            >
              <i className={`fa-solid ${t.icon}`} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.92rem] font-bold text-[#0f172a]">{t.title}</span>
              <span className="mt-1 block text-[0.75rem] leading-snug text-[#94a3b8]">{t.desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
