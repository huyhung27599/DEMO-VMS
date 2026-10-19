import { usePlaybackStore } from '../store'
import { attachTrackMapContainer, toggleTrackAnimation, toggleTrackMapFullscreen } from '../trackMapController'
import { CARD_TITLE_SPAN } from './classes'
import { Timeline } from './Timeline'
import { TrackMap } from './TrackMap'
import { TrackStats } from './TrackStats'

// RIGHT: Map + Timeline (index.html:1029-1088) — styles2.css:1737-1745, 3130-3215, 3296-3570.
// Nút bản đồ chỉ có listener sau bindEvents (store.initialized), như #pb-search-btn.
// index.html không có tab phải (.pb-right-tab) — store.rightTab chỉ phục vụ switchRightTab.

const MAP_BTN =
  'pb-map-btn flex size-8 cursor-pointer items-center justify-center rounded-sm border border-solid border-border bg-white text-text-muted transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary'

export function RightPanel() {
  const trackStatus = usePlaybackStore((s) => s.trackStatus.text)
  const trackCardVisible = usePlaybackStore((s) => s.trackCardVisible)
  const collapsed = usePlaybackStore((s) => s.rightCollapsed)
  const initialized = usePlaybackStore((s) => s.initialized)
  const animating = usePlaybackStore((s) => s.trackAnimating)
  const fsActive = usePlaybackStore((s) => s.trackMapFsActive)
  const fsMode = usePlaybackStore((s) => s.trackFsMode)
  const timelineCount = usePlaybackStore((s) => s.timelineCount)
  const fsTitle = fsActive ? 'Thoát toàn màn hình' : 'Mở rộng toàn màn hình'

  return (
    <div
      className="pb-map-col flex h-full flex-col overflow-hidden rounded-[14px] border border-solid border-[rgba(15,23,42,0.08)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
      style={collapsed ? { display: 'none' } : undefined}
    >
      <div
        className={`pb-track-card ${fsMode ? 'pb-track-fs-mode ' : ''}flex min-h-0 flex-[2] flex-col max-[1280px]:h-[450px]`}
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
              onClick={initialized ? toggleTrackAnimation : undefined}
            >
              <i className={animating ? 'fa-solid fa-stop' : 'fa-solid fa-play'} aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className={MAP_BTN}
              id="pb-map-fullscreen-btn"
              title={fsTitle}
              aria-label={fsTitle}
              onClick={initialized ? toggleTrackMapFullscreen : undefined}
            >
              <i className={fsActive ? 'fa-solid fa-compress' : 'fa-solid fa-expand'} aria-hidden="true"></i>
            </button>
            {/* `.pb-map-header span` cũng áp cho span trạng thái */}
            <span className={`pb-track-status ${CARD_TITLE_SPAN}`} id="pb-track-status-map">
              {trackStatus}
            </span>
          </div>
        </div>
        <div
          id="pb-track-map"
          ref={attachTrackMapContainer}
          className="pb-track-map map-container relative z-[1] min-h-[320px] flex-1 overflow-hidden rounded-md border-2 border-solid border-primary bg-[#eee] shadow-md"
        >
          <TrackMap />
        </div>
      </div>

      <TrackStats />

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
          <Timeline />
        </div>
      </div>
    </div>
  )
}
