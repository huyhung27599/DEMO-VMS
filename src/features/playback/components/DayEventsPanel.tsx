import { useState } from 'react'
import { showToast } from '../../../shared/ui/toastStore'
import { DEMO_DAY_EVENTS, type DayEvent, type DayEventTone } from '../mockData'
import { usePlaybackStore } from '../store'
import { findFileMetaForTime, showPlaybackIframe } from '../videoController'

const DOT: Record<DayEventTone, string> = {
  critical: 'bg-[#e11d48]',
  warn: 'bg-[#f59e0b]',
  info: 'bg-[#94a3b8]',
}

function seekToDayEvent(ev: DayEvent): void {
  const { beginTime, currentDevice, currentVehicleObj, lastSearchRange, cameraFilter } =
    usePlaybackStore.getState()

  if (!currentDevice || !currentVehicleObj || !lastSearchRange.endFmt) {
    showToast(`Nhảy tới sự kiện «${ev.title}» lúc ${ev.time} — hãy tìm kiếm video trước.`, 'info')
    return
  }

  const ymd = (beginTime || lastSearchRange.beginFmt).slice(0, 10)
  const seekTime = `${ymd} ${ev.time}:00`
  const ch = !cameraFilter || cameraFilter === '0' ? '1' : cameraFilter
  const matchedFile = findFileMetaForTime(seekTime, ch)
  void showPlaybackIframe(currentVehicleObj, ch, seekTime, lastSearchRange.endFmt, '1', '', matchedFile)
  showToast(`Nhảy tới sự kiện «${ev.title}» lúc ${ev.time}`, 'info')
}

export function DayEventsPanel() {
  const [activeId, setActiveId] = useState(DEMO_DAY_EVENTS[0]?.id ?? '')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
      <div className="border-b border-[#eef2f6] px-4 py-3.5">
        <h3 className="m-0 text-[0.9rem] font-bold text-[#0f172a]">Sự kiện trong ngày</h3>
      </div>
      <ul className="m-0 flex list-none flex-1 flex-col gap-1 overflow-y-auto p-2">
        {DEMO_DAY_EVENTS.map((ev) => {
          const selected = ev.id === activeId
          return (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveId(ev.id)
                  seekToDayEvent(ev)
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? 'border-[#f5c2c9] bg-[#fce8eb]'
                    : 'border-transparent hover:bg-[#f8fafc]'
                }`}
              >
                <span className={`size-2.5 shrink-0 rounded-full ${DOT[ev.tone]}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.85rem] font-semibold text-[#1e293b]">{ev.title}</div>
                  <div className="text-[0.75rem] tabular-nums text-[#94a3b8]">{ev.time}</div>
                </div>
                <i className="fa-solid fa-play text-[0.7rem] text-[#94a3b8]" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
