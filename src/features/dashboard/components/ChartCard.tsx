import type { ReactNode, Ref } from 'react'

// .chart-card / .chart-card-sm|md|lg / .chart-header / .chart-body / .chart-badge (styles2.css:2439-2516)
const SIZES = {
  sm: 'min-w-[180px] flex-1',
  md: 'min-w-[240px] flex-[1.5]',
  lg: 'min-w-[300px] flex-[2.5]',
  none: '',
} as const

const BADGES = {
  blue: 'bg-primary/12 text-primary',
  red: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
  purple: 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]',
} as const

export function ChartCard({
  size = 'none',
  className = '',
  icon,
  iconColor,
  title,
  badge,
  headerExtra,
  bodyId,
  bodyRef,
  children,
}: {
  size?: keyof typeof SIZES
  className?: string
  icon: string
  iconColor: string
  title: string
  badge?: { id: string; text: string; color: keyof typeof BADGES }
  headerExtra?: ReactNode
  bodyId?: string
  bodyRef?: Ref<HTMLDivElement>
  children?: ReactNode
}) {
  return (
    <div
      className={`flex flex-col rounded-md border border-border bg-base px-5 py-4 shadow-sm transition-shadow duration-250 hover:shadow-md ${SIZES[size]} ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2 text-sm font-semibold text-text-main">
        <span className="flex items-center gap-[0.35rem]">
          <i className={`fa-solid ${icon}`} style={{ color: iconColor }}></i> {title}
        </span>
        {badge ? (
          <span
            id={badge.id}
            className={`shrink-0 rounded-full px-2 py-[0.15rem] text-[0.65rem] font-semibold tracking-[0.04em] whitespace-nowrap uppercase ${BADGES[badge.color]}`}
          >
            {badge.text}
          </span>
        ) : null}
        {headerExtra}
      </div>
      {bodyId ? <div id={bodyId} ref={bodyRef} className="min-h-[200px] w-full flex-1"></div> : null}
      {children}
    </div>
  )
}
