import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { ALARM_NAME_MAP, ALARM_TYPE_MAP, getSeverity } from '../dashboard/lib'
import { aiEventTime } from '../vehicle/meta'

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
