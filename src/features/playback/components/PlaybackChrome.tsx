import { useState } from 'react'
import { CAMERA_FILTER_OPTIONS } from '../mockData'
import { usePlaybackStore } from '../store'

const SPEEDS = [1, 1.5, 2, 4] as const

function cameraLabel(filter: string): string {
  if (filter === '0') return 'Camera lái xe'
  return CAMERA_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'Camera lái xe'
}

/** Thanh điều khiển đáy player — khớp mockup; tốc độ chỉ áp dụng khi có <video>. */
export function PlaybackChrome() {
  const cameraFilter = usePlaybackStore((s) => s.cameraFilter)
  const channelTabs = usePlaybackStore((s) => s.channelTabs)
  const player = usePlaybackStore((s) => s.player)
  const [speedIdx, setSpeedIdx] = useState(0)
  const speed = SPEEDS[speedIdx]

  const cam =
    channelTabs?.active != null ? `Kênh ${channelTabs.active}` : cameraLabel(cameraFilter)

  const playing = player.kind === 'iframe' || player.kind === 'video'
  const progress = playing ? 8 : 0

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    const rate = SPEEDS[next]
    const video = document.querySelector('#pb-player-area video') as HTMLVideoElement | null
    if (video) video.playbackRate = rate
  }

  return (
    <div className="relative z-[3] shrink-0 border-t border-[#e2e8f0] bg-white px-4 pt-2.5 pb-3">
      <div className="mb-2.5 flex items-center gap-3">
        <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#fee2e2]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#e11d48] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 text-[0.75rem] font-semibold tabular-nums text-[#64748b]">
          {playing ? '00:12 / 23:45' : '00:00 / --:--'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={cycleSpeed}
          className="cursor-pointer rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[0.72rem] font-semibold text-[#475569] transition hover:border-[#e11d48]/30 hover:text-[#e11d48]"
        >
          Tốc độ phát: {speed}x
        </button>
        <span className="text-[0.75rem] font-semibold text-[#64748b]">{cam}</span>
      </div>
    </div>
  )
}
