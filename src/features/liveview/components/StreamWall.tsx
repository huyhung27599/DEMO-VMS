import { useLiveviewStore, type GridView } from '../store'
import { UnifiedPlayer, VIDEO_WALL, VIDEO_WALL_HINT } from './UnifiedPlayer'

// #video-grid (index.html:905-907, styles2.css:1529-1537 + responsive 2084-2086, 2127-2130).
// Nội dung do loadVehicleDropdown / renderVehicleStreams / renderUnifiedPlayer quyết định (useLiveviewStore.grid).

function GridContent({ grid }: { grid: GridView }) {
  if (grid.kind === 'empty') return null
  if (grid.kind === 'message') {
    return <div className="col-span-full w-full p-8 text-center text-text-muted">{grid.text}</div>
  }
  if (grid.kind === 'hint') {
    return (
      <div className={VIDEO_WALL}>
        <div className={`${VIDEO_WALL_HINT} ${grid.danger ? 'text-danger!' : ''}`}>{grid.text}</div>
      </div>
    )
  }
  return <UnifiedPlayer key={grid.token} view={grid} />
}

export function StreamWall() {
  const grid = useLiveviewStore((s) => s.grid)
  const unified = useLiveviewStore((s) => s.gridUnified)
  return (
    <div
      id="video-grid"
      className={`video-grid grid gap-4 ${
        unified
          ? 'is-unified grid-cols-1'
          : 'grid-cols-2 max-[768px]:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-[480px]:grid-cols-1'
      }`}
    >
      <GridContent grid={grid} />
    </div>
  )
}
