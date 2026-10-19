import type { ReactNode, Ref } from 'react'
import { onLeaderboardTypeChange } from '../loaders'
import { useStatisticsStore } from '../store'

// .stat-charts-grid / .chart-span-2 (statistics.css:41-54) + .chart-card/.chart-header/.chart-body (styles2.css:2439-2492)

function StatChartCard({
  span2 = false,
  className = '',
  icon,
  iconColor,
  title,
  headerExtra,
  children,
}: {
  span2?: boolean
  className?: string
  icon: string
  iconColor: string
  title: string
  headerExtra?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-md border border-border bg-base px-5 py-4 shadow-sm transition-shadow duration-250 hover:shadow-md ${
        span2 ? 'col-span-2' : ''
      } ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2 text-sm font-semibold text-text-main">
        <span className="flex items-center gap-[0.35rem]">
          <i className={`fa-solid ${icon}`} style={{ color: iconColor }} aria-hidden="true"></i> {title}
        </span>
        {headerExtra}
      </div>
      {children}
    </div>
  )
}

const CHART_BODY = 'min-h-[200px] w-full flex-1'

function Leaderboard() {
  const type = useStatisticsStore((s) => s.leaderboardType)
  const lb = useStatisticsStore((s) => s.leaderboard)

  return (
    <StatChartCard
      icon="fa-ranking-star"
      iconColor="#ef4444"
      title="Bảng xếp hạng vi phạm"
      headerExtra={
        <select
          id="stat-leaderboard-type"
          aria-label="Loại xếp hạng"
          className="stat-filter-select"
          value={type}
          onChange={(e) => onLeaderboardTypeChange(e.target.value)}
        >
          <option value="best">Ít lỗi nhất</option>
          <option value="worst">Nhiều lỗi nhất</option>
        </select>
      }
    >
      <div className={`${CHART_BODY} max-h-[300px] overflow-y-auto p-0`}>
        <ul className="m-0 list-none p-2" id="stat-leaderboard-list">
          {lb === null ? null : lb.items.length === 0 ? (
            <li className="p-4 text-center text-text-muted">Không có dữ liệu</li>
          ) : (
            lb.items.map((item, index) => (
              <li
                key={`${index}-${item[0]}`}
                className="flex items-center justify-between border-b border-border px-2 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-6 font-bold text-text-muted">{index + 1}.</div>
                  <div className="flex flex-col">
                    <span className="lb-name font-semibold text-text-main">{item[0]}</span>
                    <span className="text-[0.85rem] text-text-muted">
                      Lỗi vi phạm:{' '}
                      <strong className={lb.type === 'worst' ? 'text-danger' : 'text-primary'}>{item[1]}</strong>
                    </span>
                  </div>
                </div>
                {/* .lb-trend.up = xanh lá, .down = đỏ (statistics.css:129-130) — giữ nguyên */}
                <div className={`font-bold ${lb.type === 'worst' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  <i
                    className={`fa-solid fa-arrow-trend-${lb.type === 'worst' ? 'up' : 'down'}`}
                    aria-hidden="true"
                  ></i>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </StatChartCard>
  )
}

export function ChartsGrid({
  trendRef,
  pieRef,
  barRef,
}: {
  trendRef: Ref<HTMLDivElement>
  pieRef: Ref<HTMLDivElement>
  barRef: Ref<HTMLDivElement>
}) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Trend Line Chart */}
      <StatChartCard span2 icon="fa-chart-line" iconColor="#3b82f6" title="Xu hướng vi phạm theo thời gian">
        <div className={CHART_BODY} id="stat-chart-trend" ref={trendRef} style={{ height: 300 }}></div>
      </StatChartCard>
      {/* Distribution Pie Chart */}
      <StatChartCard icon="fa-chart-pie" iconColor="#10b981" title="Tỷ lệ theo xe">
        <div className={CHART_BODY} id="stat-chart-pie" ref={pieRef} style={{ height: 300 }}></div>
      </StatChartCard>
      {/* Bar Chart */}
      <StatChartCard span2 icon="fa-chart-bar" iconColor="#f59e0b" title="Phân bố theo loại vi phạm">
        <div className={CHART_BODY} id="stat-chart-bar" ref={barRef} style={{ height: 300 }}></div>
      </StatChartCard>
      {/* Leaderboard */}
      <Leaderboard />
    </div>
  )
}
