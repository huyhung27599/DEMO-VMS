import { usePlaybackStore } from '../store'

// .pb-stats-row (index.html:1054-1071; styles2.css) — giá trị do computeStats ghi vào store.

function StatItem({
  icon,
  color,
  label,
  id,
  value,
}: {
  icon: string
  color: string
  label: string
  id: string
  value: string
}) {
  return (
    <div className="pb-stat-item flex items-center gap-3 rounded-md border border-solid border-border bg-[#f8fafc] p-3">
      <i
        className={`fa-solid ${icon} flex size-8 items-center justify-center rounded-[8px] bg-white text-[0.9rem] shadow-sm`}
        style={{ color }}
        aria-hidden="true"
      ></i>
      <div>
        <div className="pb-stat-label text-[0.65rem] font-semibold tracking-[0.05em] text-text-muted uppercase">
          {label}
        </div>
        <div className="pb-stat-value text-[0.95rem] font-bold text-text-main" id={id}>
          {value}
        </div>
      </div>
    </div>
  )
}

export function TrackStats() {
  const stats = usePlaybackStore((s) => s.stats)
  return (
    <div className="pb-stats-row grid grid-cols-2 gap-3 border-y border-solid border-border bg-white p-4">
      <StatItem icon="fa-road" color="#3b82f6" label="Quãng đường" id="pb-stat-distance" value={stats.distance} />
      <StatItem icon="fa-gauge-high" color="#ef4444" label="Tốc độ tối đa" id="pb-stat-maxspeed" value={stats.maxspeed} />
      <StatItem
        icon="fa-clock"
        color="#10b981"
        label="Thời gian di chuyển"
        id="pb-stat-duration"
        value={stats.duration}
      />
      <StatItem icon="fa-map-pin" color="#f59e0b" label="Tổng điểm GPS" id="pb-stat-points" value={stats.points} />
    </div>
  )
}
