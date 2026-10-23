import { useLiveviewStore, type GridView } from '../store'
import { UnifiedPlayer, VIDEO_WALL, VIDEO_WALL_HINT } from './UnifiedPlayer'

function GridContent({ grid }: { grid: GridView }) {
  if (grid.kind === 'empty') return null
  if (grid.kind === 'message') {
    return (
      <div className={`${VIDEO_WALL} items-center justify-center`}>
        <div className="col-span-full w-full p-8 text-center text-white/70">{grid.text}</div>
      </div>
    )
  }
  if (grid.kind === 'hint') {
    return (
      <div className={VIDEO_WALL}>
        <div className={`${VIDEO_WALL_HINT} ${grid.danger ? 'text-[#fca5a5]!' : ''}`}>{grid.text}</div>
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
      className={`video-grid grid h-full min-h-0 gap-0 ${
        unified
          ? 'is-unified grid-cols-1'
          : 'grid-cols-1'
      }`}
    >
      <GridContent grid={grid} />
    </div>
  )
}
