import type { ReactNode } from 'react'

/**
 * Khớp mockup: 4 thẻ đặc (navy / đỏ / vàng / xám), không dùng card trắng + viền.
 */
const VARIANTS = {
  navy: {
    card: 'bg-[#0f172a] text-white shadow-[0_8px_24px_rgba(15,23,42,0.28)]',
    label: 'text-white/70',
    value: 'text-white',
    sub: 'text-white/75',
    iconWrap: 'bg-white/12 text-white',
  },
  red: {
    card: 'bg-[#e11d48] text-white shadow-[0_8px_24px_rgba(225,29,72,0.28)]',
    label: 'text-white/75',
    value: 'text-white',
    sub: 'text-white/80',
    iconWrap: 'bg-white/15 text-white',
  },
  amber: {
    card: 'bg-[#fbbf24] text-[#1e293b] shadow-[0_8px_24px_rgba(251,191,36,0.35)]',
    label: 'text-[#78350f]/80',
    value: 'text-[#1e293b]',
    sub: 'text-[#78350f]/85',
    iconWrap: 'bg-[#1e293b]/10 text-[#78350f]',
  },
  slate: {
    card: 'border border-[#e2e8f0] bg-[#f8fafc] text-[#1e293b] shadow-sm',
    label: 'text-[#64748b]',
    value: 'text-[#1e293b]',
    sub: 'text-[#64748b]',
    iconWrap: 'bg-[#e2e8f0] text-[#475569]',
  },
} as const

type KpiCardProps = {
  id: string
  variant: keyof typeof VARIANTS
  icon: string
  label: string
  valueId: string
  value: ReactNode
  sub: ReactNode
  pulse?: boolean
}

export function KpiCard({ id, variant, icon, label, valueId, value, sub, pulse = false }: KpiCardProps) {
  const v = VARIANTS[variant]
  return (
    <div
      id={id}
      className={`dashboard-kpi-card relative overflow-hidden rounded-2xl px-5 py-4 transition-[transform,box-shadow] duration-250 ease-out hover:-translate-y-0.5 ${v.card}`}
    >
      <div className="relative z-1 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={`text-[0.7rem] font-semibold tracking-[0.08em] uppercase ${v.label}`}>{label}</div>
          <div id={valueId} className={`mt-1.5 text-[2.35rem] leading-none font-bold tracking-tight ${v.value}`}>
            {value}
          </div>
          <div className={`mt-2.5 text-[0.8rem] ${v.sub}`}>{sub}</div>
        </div>
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${v.iconWrap}`}>
          <i className={`fa-solid ${icon} text-[1.25rem]`} aria-hidden />
        </div>
      </div>
      {pulse ? (
        <div className="dashboard-pulse absolute top-3.5 right-3.5 z-2 size-2.5 rounded-full bg-white" />
      ) : null}
    </div>
  )
}
