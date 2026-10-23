/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { BASE_URL } from '../../shared/api/client'
import {
  ALARM_NAME_MAP,
  ALARM_TYPE_MAP,
  alertLevelFromSeverity,
  getSeverity,
  normalizeId,
  today,
} from '../dashboard/lib'

type Row = Record<string, any>

export type VehicleStatus = 'online' | 'offline' | 'alert'

export type VehicleAlert = {
  time: string
  type: string
  driver: string
  level: 'high' | 'medium' | 'low'
}

export type VehicleMeta = {
  driver: string | null
  status: VehicleStatus
  speed: number | null
  todayKm: number | null
  alertCount: number
  /** vd. "4G · 9 vệ tinh" từ getDeviceStatus */
  firmware: string
  alerts: VehicleAlert[]
}

export const STATUS_LABEL: Record<VehicleStatus, string> = {
  online: 'Trực tuyến',
  offline: 'Offline',
  alert: 'Cảnh báo',
}

export const PAGE_SIZE = 10

export const EMPTY_META: VehicleMeta = {
  driver: null,
  status: 'offline',
  speed: null,
  todayKm: null,
  alertCount: 0,
  firmware: '—',
  alerts: [],
}

const NET_LABEL: Record<string, string> = { '0': '3G', '1': 'WiFi', '2': 'Có dây', '3': '4G', '4': '5G' }

const isOn = (x: unknown) => x === 1 || x === '1'

function fmtAlertTime(raw: unknown): string {
  const d = new Date(String(raw || '').replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return '--'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Gộp dữ liệu thật theo biển số / mã thiết bị.
 * - statusRows: getDeviceStatus.status[] (id=devIdno, vid=biển số, ol, sp/10, net, sn, dn)
 * - mileageRows: runMileage hôm nay (doc: infos[].vehIdno/mile mét; bản cũ dùng datas[].mileage km)
 * - events: syncAiEventsLocal.events[] (cùng nguồn với dashboard)
 * - driverMap: driver/mapping (biển số hoặc devIdno → tên)
 */
export function buildVehicleMeta(
  vehicles: Row[],
  statusRows: Row[],
  mileageRows: Row[],
  events: Row[],
  driverMap: Record<string, string>,
): Record<string, VehicleMeta> {
  const statusBy: Record<string, Row> = {}
  statusRows.forEach((s) => {
    ;[s.id, s.vid, s.devIdno].map(normalizeId).filter(Boolean).forEach((k) => (statusBy[k] = s))
  })

  const kmBy: Record<string, number> = {}
  mileageRows.forEach((m) => {
    const k = normalizeId(m.vehIdno ?? m.vehiIdno ?? m.vid)
    if (!k) return
    const km = m.mile !== undefined ? Number(m.mile) / 1000 : Number(m.mileage)
    if (Number.isFinite(km)) kmBy[k] = (kmBy[k] || 0) + km
  })

  const todayStr = today()
  const eventsBy: Record<string, Row[]> = {}
  events.forEach((e) => {
    const k = normalizeId(e.vehiIdno || e.vi || e.vehicleName || e.devIdno || e.did)
    if (k) (eventsBy[k] ||= []).push(e)
  })

  const out: Record<string, VehicleMeta> = {}
  vehicles.forEach((v) => {
    const plate = normalizeId(v.plate || v.nm || v.vehiIdno)
    if (!plate) return
    const devs: string[] = Array.isArray(v.dl)
      ? v.dl.map((d: Row) => normalizeId(d?.id || d?.devIdno)).filter(Boolean)
      : [normalizeId(v.dl || v.devIdno)].filter(Boolean)
    const s = [plate, ...devs].map((k) => statusBy[k]).find(Boolean)
    const evs = [plate, ...devs]
      .flatMap((k) => eventsBy[k] || [])
      .map((e): Row => ({ ...e, _t: e.fileTime || e.actualTime || e.updateTime || e.fileTimeStr || '' }))
      .sort((a, b) => String(b._t).localeCompare(String(a._t)))
    const alertCount = evs.filter((e) => String(e._t).startsWith(todayStr)).length
    const driver =
      (s?.dn as string) || [plate, ...devs].map((k) => driverMap[k]).find(Boolean) || null
    const online = !!s && (isOn(s.ol) || isOn(s.online))
    const sp = s ? Number(s.sp) / 10 : NaN
    const net = s && s.net !== undefined ? NET_LABEL[String(s.net)] : undefined
    const sats = s && s.sn !== undefined ? `${s.sn} vệ tinh` : undefined

    out[plate] = {
      driver,
      status: !online ? 'offline' : alertCount > 0 ? 'alert' : 'online',
      speed: Number.isFinite(sp) ? Number(sp.toFixed(1)) : null,
      todayKm: kmBy[plate] !== undefined ? Number(kmBy[plate].toFixed(1)) : null,
      alertCount,
      firmware: [net, sats].filter(Boolean).join(' · ') || '—',
      alerts: evs.slice(0, 10).map((e) => {
        const t = e.alarmType ?? e.ty ?? e.armType
        return {
          time: fmtAlertTime(e._t),
          type: ALARM_TYPE_MAP[Number(t)] || ALARM_NAME_MAP[Number(t)] || `Báo động #${t ?? '?'}`,
          driver: driver || '—',
          level: alertLevelFromSeverity(getSeverity(t)),
        }
      }),
    }
  })
  return out
}

const ok = (r: PromiseSettledResult<any>, key: string): Row[] => {
  const v = r.status === 'fulfilled' ? r.value : null
  if (!v || (v.result !== 0 && v.result !== '0')) return []
  const list = v[key] ?? v.datas
  return Array.isArray(list) ? list : []
}

export function vehicleMetaQueryOptions(vehicles: Row[] | undefined) {
  return queryOptions({
    queryKey: ['vehicle', 'meta', vehicles?.length ?? 0] as const,
    enabled: !!vehicles?.length,
    queryFn: async (): Promise<Record<string, VehicleMeta>> => {
      const t = today()
      // shortcut: runMileage không truyền vehiIdno → backend phân trang mặc định 50 xe; đội xe lớn hơn cần gọi theo trang
      const [st, mi, ev, dm] = await Promise.allSettled([
        api.getDeviceStatus('', ''),
        api.runMileage('', t, t),
        api.syncAiEventsLocal('', ''),
        fetch(`${BASE_URL}driver/mapping`).then((r) => (r.ok ? r.json() : {})),
      ])
      const driverMap: Record<string, string> =
        dm.status === 'fulfilled' && dm.value && typeof dm.value === 'object' ? (dm.value as Record<string, string>) : {}
      return buildVehicleMeta(vehicles ?? [], ok(st, 'status'), ok(mi, 'infos'), ok(ev, 'events'), driverMap)
    },
  })
}
