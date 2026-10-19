import { MAP_COLOR_END, MAP_COLOR_PARK, MAP_COLOR_ROUTE, MAP_COLOR_START } from '../lib'
import { usePlaybackStore } from '../store'

// Con do React quản lý bên trong #pb-track-map (Leaflet gắn bản đồ vào chính div đó):
// `.pb-map-placeholder-text` (index.html, display:none sau initMap) và #pb-track-legend
// (renderMapLegend — playback.js:1481-1497; styles2.css:3348-3392).

const LEGEND_ROW = 'pb-track-legend-row mt-1 flex items-center gap-2'
const LEGEND_DOT = 'pb-legend-dot size-[10px] shrink-0 rounded-full border-2 border-solid border-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)]'

function TrackLegend({ parkCount }: { parkCount: number }) {
  return (
    <div
      id="pb-track-legend"
      className="pb-track-legend pointer-events-none absolute bottom-[10px] left-[10px] z-[800] max-w-[220px] rounded-[8px] border border-solid border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.95)] px-[10px] py-2 text-[0.72rem] text-[#334155] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <div className="pb-track-legend-title mb-[6px] font-bold text-[#1e293b]">Chú thích</div>
      <div className={LEGEND_ROW}>
        <span className={LEGEND_DOT} style={{ background: MAP_COLOR_START }}></span> Bắt đầu hành trình
      </div>
      <div className={LEGEND_ROW}>
        <span className={LEGEND_DOT} style={{ background: MAP_COLOR_PARK }}></span> Đỗ xe ≥30 phút
        {parkCount ? ` (${parkCount})` : ''}
      </div>
      <div className={LEGEND_ROW}>
        <span className={LEGEND_DOT} style={{ background: MAP_COLOR_END }}></span> Kết thúc hành trình
      </div>
      <div className={LEGEND_ROW}>
        <span
          className="pb-legend-line h-1 w-[18px] shrink-0 rounded-[2px]"
          style={{ background: MAP_COLOR_ROUTE }}
        ></span>{' '}
        Quãng đường di chuyển
      </div>
    </div>
  )
}

export function TrackMap() {
  const initialized = usePlaybackStore((s) => s.trackMapInitialized)
  const legend = usePlaybackStore((s) => s.trackLegend)
  return (
    <>
      <div
        className="pb-map-placeholder-text absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f1f5f9] text-text-muted"
        style={initialized ? { display: 'none' } : undefined}
      >
        <i className="fa-solid fa-map fa-2x" style={{ opacity: 0.25, marginBottom: '.5rem' }} aria-hidden="true"></i>
        <p>Bản đồ hành trình sau khi tìm kiếm</p>
      </div>
      {legend === null ? null : <TrackLegend parkCount={legend} />}
    </>
  )
}
