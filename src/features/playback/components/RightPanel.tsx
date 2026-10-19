import type { ReactNode } from 'react'
import { usePlaybackStore } from '../store'
import { CARD_TITLE_SPAN, EMPTY_STATE } from './classes'

// RIGHT: Map + Timeline (index.html:1029-1088) — styles2.css:1737-1745, 3130-3147, 3296-3570.
// Điểm mở rộng Task 13 (props): `trackMap` (nội dung #pb-track-map; gắn Leaflet qua ref rồi
// videoController.setTrackMap), onClick hai nút bản đồ, `stats`, `timeline`, `timelineCount`.
// index.html không có tab phải (.pb-right-tab) — store.rightTab chỉ phục vụ switchRightTab.

type Stats = { distance: string; maxspeed: string; duration: string; points: string }

type Props = {
  /** nội dung bên trong #pb-track-map (mặc định: placeholder của index.html) */
  trackMap?: ReactNode
  /** click #pb-track-play-btn (toggleTrackAnimation — Task 13) */
  onTrackPlayClick?: () => void
  /** click #pb-map-fullscreen-btn (toggleTrackMapFullscreen — Task 13) */
  onFullscreenClick?: () => void
  /** nội dung #pb-timeline-body (mặc định: trạng thái rỗng của index.html) */
  timeline?: ReactNode
  /** #pb-timeline-count */
  timelineCount?: string
  /** #pb-stat-distance / maxspeed / duration / points */
  stats?: Stats
}

const MAP_BTN =
  'pb-map-btn flex size-8 cursor-pointer items-center justify-center rounded-sm border border-solid border-border bg-white text-text-muted transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary'

const DEFAULT_STATS: Stats = { distance: '--', maxspeed: '--', duration: '--', points: '--' }

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

export function RightPanel({
  trackMap,
  onTrackPlayClick,
  onFullscreenClick,
  timeline,
  timelineCount = '0 điểm',
  stats = DEFAULT_STATS,
}: Props) {
  const trackStatus = usePlaybackStore((s) => s.trackStatus.text)
  const trackCardVisible = usePlaybackStore((s) => s.trackCardVisible)
  const collapsed = usePlaybackStore((s) => s.rightCollapsed)

  return (
    <div
      className="pb-map-col flex h-full flex-col overflow-hidden rounded-[14px] border border-solid border-[rgba(15,23,42,0.08)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
      style={collapsed ? { display: 'none' } : undefined}
    >
      <div
        className="pb-track-card flex min-h-0 flex-[2] flex-col max-[1280px]:h-[450px]"
        id="pb-track-card"
        style={trackCardVisible ? undefined : { display: 'none' }}
      >
        <div className="pb-map-header flex items-center justify-between border-b border-solid border-border bg-[#f8fafc] px-5 py-3">
          <span className={CARD_TITLE_SPAN}>
            <i className="fa-solid fa-map-location-dot" style={{ color: '#2a9dd8' }} aria-hidden="true"></i> Hành
            trình GPS
          </span>
          <div className="pb-map-actions flex gap-2">
            <button
              type="button"
              className={MAP_BTN}
              id="pb-track-play-btn"
              title="Phát lại hành trình"
              aria-label="Phát lại hành trình"
              onClick={onTrackPlayClick}
            >
              <i className="fa-solid fa-play" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className={MAP_BTN}
              id="pb-map-fullscreen-btn"
              title="Mở rộng toàn màn hình"
              aria-label="Mở rộng toàn màn hình"
              onClick={onFullscreenClick}
            >
              <i className="fa-solid fa-expand" aria-hidden="true"></i>
            </button>
            {/* `.pb-map-header span` cũng áp cho span trạng thái */}
            <span className={`pb-track-status ${CARD_TITLE_SPAN}`} id="pb-track-status-map">
              {trackStatus}
            </span>
          </div>
        </div>
        <div
          id="pb-track-map"
          className="pb-track-map map-container relative z-[1] min-h-[320px] flex-1 overflow-hidden rounded-md border-2 border-solid border-primary bg-[#eee] shadow-md"
        >
          {trackMap ?? (
            <div className="pb-map-placeholder-text absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f1f5f9] text-text-muted">
              <i
                className="fa-solid fa-map fa-2x"
                style={{ opacity: 0.25, marginBottom: '.5rem' }}
                aria-hidden="true"
              ></i>
              <p>Bản đồ hành trình sau khi tìm kiếm</p>
            </div>
          )}
        </div>
      </div>

      <div className="pb-stats-row grid grid-cols-2 gap-3 border-y border-solid border-border bg-white p-4">
        <StatItem icon="fa-road" color="#3b82f6" label="Quãng đường" id="pb-stat-distance" value={stats.distance} />
        <StatItem
          icon="fa-gauge-high"
          color="#ef4444"
          label="Tốc độ tối đa"
          id="pb-stat-maxspeed"
          value={stats.maxspeed}
        />
        <StatItem
          icon="fa-clock"
          color="#10b981"
          label="Thời gian di chuyển"
          id="pb-stat-duration"
          value={stats.duration}
        />
        <StatItem icon="fa-map-pin" color="#f59e0b" label="Tổng điểm GPS" id="pb-stat-points" value={stats.points} />
      </div>

      <div className="pb-timeline-card flex min-h-0 flex-1 flex-col bg-white">
        <div className="pb-timeline-header flex items-center justify-between border-b border-solid border-border bg-[#f8fafc] px-5 py-[0.65rem]">
          <span className="flex items-center gap-2 text-[0.82rem] font-bold text-text-main">
            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#8b5cf6' }} aria-hidden="true"></i> Nhật ký
            GPS
          </span>
          {/* `.pb-timeline-header span` (0,1,1) thắng `.pb-timeline-count` về cỡ chữ/màu như bản gốc */}
          <span
            className="pb-timeline-count flex items-center gap-2 rounded-full bg-[rgba(139,92,246,0.1)] px-[0.6rem] py-[0.1rem] text-[0.82rem] font-bold text-text-main"
            id="pb-timeline-count"
          >
            {timelineCount}
          </span>
        </div>
        <div className="pb-timeline-body flex-1 overflow-y-auto" id="pb-timeline-body">
          {timeline ?? (
            <div className={EMPTY_STATE}>
              <i className="fa-solid fa-location-dot fa-2x" style={{ opacity: 0.3 }} aria-hidden="true"></i>
              <p>Lịch sử GPS hiển thị sau khi tìm kiếm</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
