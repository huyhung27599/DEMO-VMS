import { useEffect, useRef } from 'react'
import { showToast } from '../../../shared/ui/toastStore'
import { onTileClick } from '../actions'
import { CAMERA_SLOT_LABELS } from '../mockData'
import type { GridView } from '../store'
import { DriverInfoCard } from './DriverInfoCard'

export type PlayerView = Extract<GridView, { kind: 'player' }>

/** .video-wall — dark wall khớp mockup giám sát */
export const VIDEO_WALL =
  'video-wall flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0f172a] shadow-md min-[1025px]:max-[1919px]:min-h-[480px]'
export const VIDEO_WALL_HINT = 'video-wall-hint p-8 text-center text-white/70'

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
      <div className="video-wall-header flex items-center justify-between gap-3 border-b border-white/10 bg-[#111827] px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="video-wall-title truncate text-[0.95rem] font-bold">{vehicleName || deviceId}</div>
          <div className="mt-0.5 text-[0.75rem] text-white/55">Thiết bị: {deviceId}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="liveview-driver-compact relative z-[100] mr-1 hidden max-w-[220px] min-w-[160px] items-center overflow-visible! rounded-lg border border-white/10 bg-white/95 px-2 py-1.5 text-[0.72rem] text-[#1f2937] shadow-sm sm:flex">
            <div
              className="liveview-driver-content flex w-full items-center gap-2 overflow-visible!"
              data-driver-content=""
            >
              <DriverInfoCard deviceId={deviceId} token={view.token} />
            </div>
          </div>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-white/20"
            onClick={() => showToast('Chụp ảnh — tính năng sẽ kết nối API sau.', 'info')}
          >
            <i className="fa-solid fa-camera" aria-hidden /> Chụp ảnh
          </button>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-white/20"
            onClick={() => showToast('Loa đàm thoại — tính năng sẽ kết nối API sau.', 'info')}
          >
            <i className="fa-solid fa-volume-high" aria-hidden /> Loa
          </button>
        </div>
      </div>

      <div
        className="video-tile relative flex min-h-0 flex-1 cursor-pointer items-center justify-center bg-[#020617] [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0 [&_iframe]:bg-black [&_iframe]:object-contain"
        title={`Focus map: ${deviceId}`}
        onClick={() => onTileClick(deviceId)}
      >
        {iframe ? (
          <IframeHost iframe={iframe} />
        ) : (
          <div className="absolute inset-0 grid grid-cols-2 gap-px bg-[#1e293b] p-px">
            {CAMERA_SLOT_LABELS.map((label, i) => (
              <div key={label} className="relative flex flex-col items-center justify-center bg-[#0b1220] text-white/70">
                <span className="absolute top-2 left-2 text-[0.7rem] font-semibold text-white/80">{label}</span>
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded bg-[#e11d48]/90 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-white">
                  <span className="size-1.5 rounded-full bg-white" /> LIVE
                </span>
                {i === 0 ? (
                  <span className={`${VIDEO_WALL_HINT} !p-0`} id="liveview-unified-loader">
                    {failed ? 'Stream Not Available' : 'Connecting...'}
                  </span>
                ) : (
                  <span className="text-[0.85rem] text-white/45">{failed ? '—' : 'Đang phát...'}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
