import { queryOptions, useQuery } from '@tanstack/react-query'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { api } from '../../shared/api/endpoints'
import { isAuthenticated } from '../../shared/auth/session'
import { ALARM_IDS, CRITICAL_ALARM_TYPES, formatDt } from './lib'
import { showAiToast, type Loose } from './store'

// event-server.js:6, 207-256

export const eventServerKeys = { alarms: ['event-server', 'alarms'] as const }

let seenAlerts = new Set<string>()

export function resetEventServerState(): void {
  seenAlerts = new Set()
}

export async function pollAlarms(): Promise<null> {
  if (!isAuthenticated()) return null

  try {
    const end = new Date()
    // Fetch alerts from the last 15 seconds (interval 15 s)
    const start = new Date(end.getTime() - 15 * 1000)

    // Gọi Alarm list cho toàn bộ fleet (devIdno="")
    const res = (await api.querySafetyAlarm(formatDt(start), formatDt(end), ALARM_IDS, '', 1, 50)) as Loose

    if (res && res.result === 0) {
      const alarms: Loose[] = res.alarms || res.alarmsInfos || []

      // Sắp xếp theo t để hiển thị cái cũ nhất lên trước
      alarms
        .sort((a, b) => (a.st || a.stm || 0) - (b.st || b.stm || 0))
        .forEach((a) => {
          const id = a.guid || (a.devIdno || a.devId) + '-' + (a.st || a.stm) + '-' + (a.ty || a.armType)
          const armType = a.ty || a.armType

          if (!id) return
          if (seenAlerts.has(id)) return

          // Chỉ cảnh báo lỗi nguy hiểm nằm trong danh sách ADAS/DSM trọng điểm
          if (CRITICAL_ALARM_TYPES.includes(parseInt(armType))) {
            showAiToast(a)
          }

          seenAlerts.add(id)

          // Ngăn chặn memory leak
          if (seenAlerts.size > 1500) {
            const iterator = seenAlerts.values()
            seenAlerts.delete(iterator.next().value as string)
          }
        })
    }
  } catch (err) {
    console.warn('Global AI Event Poll error:', err)
  }
  return null
}

/** initialData + staleTime: Infinity: bản gốc không poll ngay khi init, lần đầu sau 15 s (startPolling). */
export function eventServerAlarmsQueryOptions(enabled: boolean = true) {
  return queryOptions({
    queryKey: eventServerKeys.alarms,
    queryFn: pollAlarms,
    refetchInterval: 15_000,
    enabled,
    initialData: null,
    staleTime: Infinity,
  })
}

/** EventServerModule.init (main.js:63-65): bật từ lần showApp đầu tiên. */
export function useEventServerPolling(): void {
  const enabled = useModuleEnabled('event-server')
  useQuery(eventServerAlarmsQueryOptions(enabled))
}
