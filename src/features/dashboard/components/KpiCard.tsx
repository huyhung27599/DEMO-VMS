import type { ReactNode } from 'react'

// .kpi-card + .kpi-blue/green/gray/teal/red/purple (styles2.css:2253-2400)
const COLORS = {
  blue: 'bg-[linear-gradient(135deg,#2563eb,#3b82f6)]',
  green: 'bg-[linear-gradient(135deg,#059669,#10b981)]',
  gray: 'bg-[linear-gradient(135deg,#475569,#64748b)]',
  teal: 'bg-[linear-gradient(135deg,#0891b2,#06b6d4)]',
  red: 'bg-[linear-gradient(135deg,#b91c1c,#ef4444)]',
  purple: 'bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)]',
} as const

type KpiCardProps = {
  id: string
  color: keyof typeof COLORS
  icon: string
  label: string
  valueId: string
  value: ReactNode
  sub: ReactNode
  /** undefined = không có thanh tiến trình (card báo động có chấm nhấp nháy) */
  bar?: { id?: string; width: number; faded?: boolean }
  pulse?: boolean
}

export function KpiCard({ id, color, icon, label, valueId, value, sub, bar, pulse = false }: KpiCardProps) {
  return (
    <div
      id={id}
      className={`dashboard-kpi-card relative cursor-default overflow-hidden rounded-lg px-5 pt-[1.1rem] pb-3 text-white shadow-[0_4px_15px_rgba(0,0,0,0.15)] transition-[transform,box-shadow] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] ${COLORS[color]}`}
    >
      <div className="relative z-1 flex items-start gap-[0.85rem]">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-white/18 text-[1.2rem]">
          <i className={`fa-solid ${icon}`}></i>
        </div>
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden text-[0.72rem] font-medium tracking-[0.04em] text-ellipsis whitespace-nowrap uppercase opacity-85">
            {label}
          </div>
          <div id={valueId} className="my-[0.15rem] text-[1.85rem] leading-[1.1] font-bold tracking-[-0.02em]">
            {value}
          </div>
          <div className="overflow-hidden text-[0.7rem] text-ellipsis whitespace-nowrap opacity-75">{sub}</div>
        </div>
      </div>
      {bar ? (
        <div className="relative z-1 mt-3 h-1 overflow-hidden rounded-xs bg-white/20">
          <div
            id={bar.id}
            className={`h-full rounded-xs transition-[width] duration-800 ease-in-out ${
              bar.faded ? 'bg-white/30' : 'bg-white/60'
            }`}
            style={{ width: `${bar.width}%` }}
          ></div>
        </div>
      ) : null}
      {pulse ? (
        <div className="dashboard-pulse absolute top-3 right-3 z-2 size-[10px] rounded-full bg-white"></div>
      ) : null}
    </div>
  )
}
