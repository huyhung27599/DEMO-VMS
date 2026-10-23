import { useState } from 'react'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { api } from '../../../shared/api/endpoints'
import { showToast } from '../../../shared/ui/toastStore'
import { ALARM_NAME_MAP, ALARM_TYPE_MAP, getSeverity, today } from '../../dashboard/lib'
import { aiEventTime } from '../../vehicle/meta'
import { usePlaybackStore } from '../store'
import { findFileMetaForTime, showPlaybackIframe } from '../videoController'

export type DayEventTone = 'critical' | 'warn' | 'info'

export type DayEvent = {
  id: string
  title: string
  time: string
  tone: DayEventTone
}

const TONE: Record<ReturnType<typeof getSeverity>, DayEventTone> = { critical: 'critical', warning: 'warn', info: 'info' }

/** Sự kiện AI của thiết bị trong ngày (syncAiEventsLocal — cùng nguồn với dashboard/liveview). */
export function dayEventsQueryOptions(devIdno: string, ymd: string) {
  return queryOptions({
    queryKey: ['playback', 'dayEvents', devIdno, ymd] as const,
    enabled: !!devIdno,
    queryFn: async (): Promise<DayEvent[]> => {
      const res = await api.syncAiEventsLocal(devIdno, '')
      const events = res && res.result === 0 && Array.isArray(res.events) ? (res.events as Record<string, unknown>[]) : []
      return events
        .filter((e) => String(e.devIdno || e.did || devIdno) === devIdno && aiEventTime(e).startsWith(ymd))
        .sort((a, b) => aiEventTime(a).localeCompare(aiEventTime(b)))
        .map((e, i) => {
          const t = Number(e.alarmType ?? e.ty ?? e.armType)
          return {
            id: String(e.id ?? `${aiEventTime(e)}-${i}`),
            title: ALARM_TYPE_MAP[t] || ALARM_NAME_MAP[t] || `Báo động #${t}`,
            time: aiEventTime(e).slice(11, 16),
            tone: TONE[getSeverity(t)],
          }
        })
    },
  })
}

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
  const [activeId, setActiveId] = useState('')
  const currentDevice = usePlaybackStore((s) => s.currentDevice) || ''
  const ymd = usePlaybackStore((s) => (s.beginTime || s.lastSearchRange.beginFmt).slice(0, 10)) || today()
  const events = useQuery(dayEventsQueryOptions(currentDevice, ymd)).data ?? []

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
      <div className="border-b border-[#eef2f6] px-4 py-3.5">
        <h3 className="m-0 text-[0.9rem] font-bold text-[#0f172a]">Sự kiện trong ngày</h3>
      </div>
      <ul className="m-0 flex list-none flex-1 flex-col gap-1 overflow-y-auto p-2">
        {events.length === 0 ? (
          <li className="px-3 py-6 text-center text-[0.8rem] text-[#94a3b8]">
            {currentDevice ? 'Không có sự kiện trong ngày' : 'Chọn xe và tìm kiếm để xem sự kiện'}
          </li>
        ) : null}
        {events.map((ev) => {
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
