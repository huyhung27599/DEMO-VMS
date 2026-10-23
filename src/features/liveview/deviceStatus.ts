/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { reverseGeocodeCached } from '../playback/geocode'

type Row = Record<string, any>

export type DeviceStatusItem = {
  id: string
  label: string
  value: string
  tone: 'ok' | 'warn' | 'bad'
  icon: string
}

const NET_LABEL: Record<string, string> = { '0': '3G', '1': 'WiFi', '2': 'Có dây', '3': '4G', '4': '5G' }
const isOn = (x: unknown) => x === 1 || x === '1'

/** getDeviceStatus.status[0] + getLoadDeviceInfo.devstaus[0] → các dòng "Trạng thái thiết bị". */
export function toDeviceStatusItems(s: Row | null, load: Row | null): DeviceStatusItem[] {
  const online = !!s && (isOn(s.ol) || isOn(s.online))
  const sats = Number(s?.sn)
  const all = Number(load?.AllVolume)
  const left = Number(load?.LeftVolume)
  const usedPct = all > 0 && Number.isFinite(left) ? Math.round((1 - left / all) * 100) : null
  const driver = String(s?.dn || '').trim()

  return [
    {
      id: 'gps',
      label: 'GPS',
      value: Number.isFinite(sats) && s?.sn !== undefined ? `${sats} vệ tinh` : '—',
      tone: !s ? 'bad' : sats >= 4 ? 'ok' : 'warn',
      icon: 'fa-location-crosshairs',
    },
    {
      id: 'signal',
      label: 'Tín hiệu',
      value: s?.net !== undefined ? NET_LABEL[String(s.net)] || '—' : '—',
      tone: online ? 'ok' : 'bad',
      icon: 'fa-signal',
    },
    {
      id: 'server',
      label: 'Máy chủ',
      value: !s ? '—' : online ? 'Đã kết nối' : 'Mất kết nối',
      tone: online ? 'ok' : 'bad',
      icon: 'fa-server',
    },
    {
      id: 'storage',
      label: 'Bộ nhớ',
      value: usedPct === null ? '—' : `${usedPct}%`,
      tone: usedPct === null ? 'warn' : usedPct >= 90 ? 'bad' : usedPct >= 70 ? 'warn' : 'ok',
      icon: 'fa-hard-drive',
    },
    {
      id: 'driver',
      label: 'Đăng nhập tài xế',
      value: driver || '—',
      tone: driver ? 'ok' : 'warn',
      icon: 'fa-id-card',
    },
  ]
}

const first = (r: PromiseSettledResult<any>, key: string): Row | null => {
  const v = r.status === 'fulfilled' ? r.value : null
  const list = v && v.result === 0 ? v[key] : null
  return Array.isArray(list) && list.length ? list[0] : null
}

export function liveDeviceStatusQueryOptions(deviceId: string) {
  return queryOptions({
    queryKey: ['liveview', 'deviceStatus', deviceId] as const,
    enabled: !!deviceId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const [st, ld] = await Promise.allSettled([api.getDeviceStatus(deviceId, ''), api.getLoadDeviceInfo(deviceId)])
      const s = first(st, 'status')
      // lat/lng là độ × 1e6 theo tài liệu 808gps
      const lat = Number(s?.lat) / 1e6
      const lng = Number(s?.lng) / 1e6
      const address =
        String(s?.ps || '').trim() ||
        (lat && lng && Number.isFinite(lat) && Number.isFinite(lng) ? await reverseGeocodeCached(lat, lng) : '')
      return { items: toDeviceStatusItems(s, first(ld, 'devstaus')), address }
    },
  })
}
