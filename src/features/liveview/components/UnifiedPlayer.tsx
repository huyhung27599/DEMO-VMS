import { useEffect, useRef } from 'react'
import { onTileClick } from '../actions'
import type { GridView } from '../store'
import { DriverInfoCard } from './DriverInfoCard'

// liveview.js:1127-1197 renderUnifiedPlayer (phần DOM) + styles2.css:1539-1630 (.video-wall, .video-tile...).

export type PlayerView = Extract<GridView, { kind: 'player' }>

/** .video-wall (dùng chung cho thông báo .video-wall-hint) */
export const VIDEO_WALL =
  'video-wall flex h-full min-h-[800px] flex-col overflow-hidden rounded-lg border border-solid border-[#2a9dd8] bg-[#eeeeee] shadow-md min-[1025px]:max-[1919px]:min-h-[736px]'
export const VIDEO_WALL_HINT = 'video-wall-hint p-8 text-center text-white/75'

/** Chỗ gắn iframe do streamController tạo (bản gốc: tile.innerHTML = ''; tile.appendChild(iframe)). */
function IframeHost({ iframe }: { iframe: HTMLIFrameElement }) {
  const hostRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (host && iframe.parentElement !== host) host.replaceChildren(iframe)
  }, [iframe])
  return <div ref={hostRef} className="contents" />
}

export function UnifiedPlayer({ view }: { view: PlayerView }) {
  const { vehicleName, deviceId, iframe, failed } = view
  return (
    <div className={VIDEO_WALL}>
      <div className="video-wall-header flex items-center justify-between border-b border-solid border-white/[0.08] bg-[#2a9dd8] px-4 py-3 text-white/90">
        <div className="min-w-0">
          <div className="video-wall-title whitespace-nowrap text-[0.95rem] font-bold">{vehicleName || deviceId}</div>
          <div className="mt-[2px] text-[0.75rem] text-[#1e3a8a] opacity-90">Thiết bị: {deviceId}</div>
        </div>
        <div className="liveview-driver-compact relative z-[100] ml-auto flex max-w-[48%] min-w-[200px] items-center overflow-visible! rounded-[8px] border border-solid border-[rgba(30,64,175,0.2)] bg-white/85 px-[0.6rem] py-[0.4rem] text-[0.75rem] text-[#1f2937] shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          {/* [data-driver-content]: loadDriverInfoForWall / renderDriverInfo (driverInfo.ts) */}
          <div
            className="liveview-driver-content flex w-full items-center gap-[10px] overflow-visible!"
            data-driver-content=""
          >
            <DriverInfoCard deviceId={deviceId} token={view.token} />
          </div>
        </div>
      </div>
      <div
        className="video-tile relative flex min-h-0 flex-1 cursor-pointer items-center justify-center bg-black [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0 [&_iframe]:bg-black [&_iframe]:object-contain"
        title={`Focus map: ${deviceId}`}
        onClick={() => onTileClick(deviceId)}
      >
        {iframe ? (
          <IframeHost iframe={iframe} />
        ) : (
          <div className={VIDEO_WALL_HINT} id="liveview-unified-loader">
            {failed ? 'Stream Not Available' : 'Connecting...'}
          </div>
        )}
      </div>
    </div>
  )
}
