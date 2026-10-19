import type { ReactNode } from 'react'
import { useStatisticsStore } from '../store'

// .stat-kpi-grid (statistics.css:29-33) + .kpi-card .kpi-<màu> (styles2.css:2253-2400; class dashboard-kpi-card
// lấy hai vòng tròn trang trí ::before/::after từ dashboard.css)
const COLORS = {
  purple: 'bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)]',
  green: 'bg-[linear-gradient(135deg,#059669,#10b981)]',
  blue: 'bg-[linear-gradient(135deg,#2563eb,#3b82f6)]',
  red: 'bg-[linear-gradient(135deg,#b91c1c,#ef4444)]',
  gray: 'bg-[linear-gradient(135deg,#475569,#64748b)]',
  teal: 'bg-[linear-gradient(135deg,#0891b2,#06b6d4)]',
} as const

type StatKpiCardProps = {
  color: keyof typeof COLORS
  icon: string
  label: string
  valueId: string
  value: ReactNode
  sub: ReactNode
  small?: boolean
}

function StatKpiCard({ color, icon, label, valueId, value, sub, small = false }: StatKpiCardProps) {
  return (
    <div
      className={`dashboard-kpi-card relative cursor-default overflow-hidden rounded-lg px-5 pt-[1.1rem] pb-3 text-white shadow-[0_4px_15px_rgba(0,0,0,0.15)] transition-[transform,box-shadow] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] ${COLORS[color]}`}
    >
      <div className="relative z-1 flex items-start gap-[0.85rem]">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-white/18 text-[1.2rem]">
          <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
        </div>
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden text-[0.72rem] font-medium tracking-[0.04em] text-ellipsis whitespace-nowrap uppercase opacity-85">
            {label}
          </div>
          <div
            id={valueId}
            className={`my-[0.15rem] leading-[1.1] font-bold tracking-[-0.02em] ${small ? 'text-[1.15rem]' : 'text-[1.85rem]'}`}
          >
            {value}
          </div>
          <div className="overflow-hidden text-[0.7rem] text-ellipsis whitespace-nowrap opacity-75">{sub}</div>
        </div>
      </div>
    </div>
  )
}

export function KpiGrid() {
  const k = useStatisticsStore((s) => s.kpis)
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <StatKpiCard
        color="purple"
        icon="fa-triangle-exclamation"
        label="Tổng vi phạm"
        valueId="kpi-total-violations"
        value={k.total}
        sub="Tất cả các lỗi"
      />
      <StatKpiCard
        color="green"
        icon="fa-shield-halved"
        label="Tỷ lệ an toàn"
        valueId="kpi-safety-rate"
        value={k.safetyRate}
        sub="% thời gian không vi phạm"
      />
      <StatKpiCard
        color="blue"
        icon="fa-star"
        label="Điểm an toàn TB"
        valueId="kpi-avg-score"
        value={k.avgScore}
        sub="Thang điểm 100"
      />
      <StatKpiCard
        color="red"
        icon="fa-gauge-high"
        label="Vi phạm / 100km"
        valueId="kpi-violation-per-100km"
        value={k.per100}
        sub="Trung bình toàn đội"
      />
      <StatKpiCard
        color="gray"
        icon="fa-list-ol"
        label="Vi phạm phổ biến"
        valueId="kpi-top-violation"
        value={k.topViolation}
        small
        sub={
          <>
            Chiếm <span id="kpi-top-violation-pct">{k.topPct}</span>%
          </>
        }
      />
      {/* Card an toàn */}
      <StatKpiCard
        color="teal"
        icon="fa-award"
        label="Tài xế an toàn"
        valueId="kpi-safe-drivers"
        value={k.safeDrivers}
        sub="0 vi phạm trong kỳ"
      />
    </div>
  )
}
