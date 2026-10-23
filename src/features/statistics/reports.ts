/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { BASE_URL } from '../../shared/api/client'
import { companiesFromVehicleResponse, type CompanyNode } from '../vehicle/queries'
import { formatDt } from './lib'
import type { ReportTypeId } from './mockData'

type Row = Record<string, any>

export type ReportVehicle = { plate: string; devIdno: string; companyId: string }
export type ReportOptions = { vehicles: ReportVehicle[]; companies: CompanyNode[] }
export type ReportTable = { headers: string[]; rows: string[][] }

const OVERSPEED = 11 // armType quá tốc độ (doc 808gps)

const pad = (n: number) => String(n).padStart(2, '0')
const ok = (r: any) => r && (r.result === 0 || r.result === '0')
const list = (r: any, ...keys: string[]): Row[] => {
  if (!ok(r)) return []
  for (const k of keys) if (Array.isArray(r[k])) return r[k]
  return []
}

/** Chuỗi 'YYYY-MM-DD HH:mm:ss' hoặc mili-giây → 'dd/MM HH:mm'. */
export function fmtShort(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const d = typeof v === 'number' || /^\d+$/.test(String(v)) ? new Date(Number(v)) : new Date(String(v).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(v)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h ? `${h}g ${pad(m)}p` : `${m} phút`
}

/** runMileage: doc trả infos[].mile (mét); bản cũ đọc datas[].mileage (km). */
export const mileKm = (r: Row): number => (r.mile !== undefined ? Number(r.mile) / 1000 : Number(r.mileage)) || 0

export function tripRows(plate: string, driver: string, infos: Row[]): string[][] {
  return infos.map((r) => [
    plate,
    driver,
    fmtShort(r.sTimeStr ?? r.startTime),
    fmtShort(r.eTimeStr ?? r.endTime),
    '—',
    '—',
    `${mileKm(r).toFixed(1)} km`,
  ])
}

export function speedRow(plate: string, driver: string, alarms: Row[], total?: number): string[] {
  const speeds = alarms.flatMap((a) => [Number(a.ssp), Number(a.esp)]).filter((x) => Number.isFinite(x) && x > 0)
  const max = speeds.length ? `${Math.round(Math.max(...speeds) / 10)} km/h` : '—'
  return [plate, driver, '—', max, String(total ?? alarms.length)]
}

export function drivingRow(plate: string, driver: string, infos: Row[]): string[] {
  const secs = infos.map((r) => Number(r.ttime) || 0)
  const total = secs.reduce((a, b) => a + b, 0)
  // QCVN: quá 10 giờ/ngày là vi phạm; mỗi dòng runMileage tương ứng một ngày
  const violate = secs.some((s) => s > 10 * 3600)
  return [plate, driver, '—', fmtDuration(total), infos.length ? (violate ? 'Có' : 'Không') : '—']
}

export function stopRows(plate: string, driver: string, infos: Row[]): string[][] {
  return infos.map((r) => [
    plate,
    driver,
    fmtShort(r.armTimeStart ?? r.stm ?? r.beginTime),
    String(r.startPosition || r.ps || r.address || '—'),
    fmtDuration(Number(r.alarmTotalTime ?? r.parkTime)),
  ])
}

export function summaryRow(plate: string, km: number | null, overSpeed: number | null, aiAlerts: number): string[] {
  return [plate, '—', km === null ? '—' : `${km.toFixed(1)} km`, overSpeed === null ? '—' : String(overSpeed), String(aiAlerts)]
}

export const REPORT_HEADERS: Record<Exclude<ReportTypeId, 'ai'>, string[]> = {
  trips: ['Biển số', 'Tài xế', 'Bắt đầu', 'Kết thúc', 'Điểm đi', 'Điểm đến', 'Quãng đường'],
  speed: ['Biển số', 'Tài xế', 'TB', 'Max', 'Vượt tốc'],
  driving: ['Biển số', 'Tài xế', 'Liên tục', 'Trong kỳ', 'Vi phạm 10h/ngày'],
  stops: ['Biển số', 'Tài xế', 'Thời điểm', 'Vị trí', 'Thời lượng'],
  summary: ['Biển số', 'Chuyến', 'Quãng đường', 'Vượt tốc', 'Cảnh báo AI'],
}

/** Từ phản hồi queryUserVehicle (loadStatistics đã gọi sẵn) → DN / xe cho bộ lọc báo cáo. */
export function buildReportOptions(res: any): ReportOptions {
  const vehicles = (ok(res) && Array.isArray(res.vehicles) ? res.vehicles : []).map((v: Row) => ({
    plate: String(v.nm || v.vehiIdno || v.plate || '').trim(),
    devIdno: String(Array.isArray(v.dl) ? v.dl[0]?.id || '' : v.dl || v.devIdno || ''),
    companyId: String(v.pid ?? v.companyId ?? ''),
  }))
  return {
    vehicles: vehicles.filter((v: ReportVehicle) => v.plate),
    companies: ok(res) ? companiesFromVehicleResponse(res) : [],
  }
}

export type ReportParams = {
  type: Exclude<ReportTypeId, 'ai'>
  start: Date
  end: Date
  enterprise: string
  vehicle: string
  /** đổi khi bấm Xem báo cáo / làm mới để chạy lại */
  nonce: string
}

async function runPool<T>(items: T[], fn: (x: T) => Promise<void>, concurrency = 4) {
  let i = 0
  await Promise.allSettled(
    Array.from({ length: concurrency }, async () => {
      while (i < items.length) await fn(items[i++])
    }),
  )
}

// shortcut: tối đa 50 xe mỗi báo cáo để không dội API (mỗi xe 1-2 lời gọi); đội xe lớn cần phân trang
const MAX_VEHICLES = 50

export function reportQueryOptions(p: ReportParams, options: ReportOptions | null) {
  return queryOptions({
    queryKey: ['statistics', 'report', p.type, formatDt(p.start), formatDt(p.end), p.enterprise, p.vehicle, p.nonce] as const,
    enabled: !!options,
    queryFn: async (): Promise<ReportTable> => {
      const vehicles = (options?.vehicles ?? [])
        .filter((v) => (!p.enterprise || v.companyId === p.enterprise) && (!p.vehicle || v.plate === p.vehicle))
        .slice(0, MAX_VEHICLES)
      const begin = formatDt(p.start)
      const end = formatDt(p.end)
      const dBegin = begin.slice(0, 10)
      const dEnd = end.slice(0, 10)
      const driverMap: Record<string, string> = await fetch(`${BASE_URL}driver/mapping`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
      const driverOf = (v: ReportVehicle) => driverMap[v.plate] || driverMap[v.devIdno] || '—'
      const out: Record<string, string[][]> = {}

      let aiByPlate: Record<string, number> = {}
      if (p.type === 'summary') {
        const res: any = await api.syncAiEventsLocal('', '')
        aiByPlate = {}
        list(res, 'events').forEach((e) => {
          const t = String(e.fileTime || e.actualTime || e.updateTime || '')
          if (t < begin || t > end) return
          const k = String(e.vehiIdno || e.vi || e.vehicleName || '').trim()
          if (k) aiByPlate[k] = (aiByPlate[k] || 0) + 1
        })
      }

      await runPool(vehicles, async (v) => {
        const drv = driverOf(v)
        switch (p.type) {
          case 'trips':
            out[v.plate] = tripRows(v.plate, drv, list(await api.runMileage(v.plate, dBegin, dEnd), 'infos', 'datas'))
            break
          case 'speed': {
            const r: any = await api.queryAlarmDetail(v.devIdno, begin, end, OVERSPEED)
            const alarms = list(r, 'alarms')
            out[v.plate] = [speedRow(v.plate, drv, alarms, r?.pagination?.totalRecords)]
            break
          }
          case 'driving':
            out[v.plate] = [drivingRow(v.plate, drv, list(await api.runMileage(v.plate, dBegin, dEnd), 'infos', 'datas'))]
            break
          case 'stops':
            out[v.plate] = stopRows(v.plate, drv, list(await api.parkDetail(v.plate, begin, end), 'infos'))
            break
          case 'summary': {
            const [mi, al] = await Promise.all([
              api.runMileage(v.plate, dBegin, dEnd),
              v.devIdno ? api.queryAlarmDetail(v.devIdno, begin, end, OVERSPEED) : Promise.resolve(null),
            ])
            const km = ok(mi) ? list(mi, 'infos', 'datas').reduce((s, r) => s + mileKm(r), 0) : null
            const over = ok(al) ? Number((al as any).pagination?.totalRecords ?? list(al, 'alarms').length) : null
            out[v.plate] = [summaryRow(v.plate, km, over, aiByPlate[v.plate] || 0)]
            break
          }
        }
      })

      // giữ thứ tự xe như danh sách
      return { headers: REPORT_HEADERS[p.type], rows: vehicles.flatMap((v) => out[v.plate] ?? []) }
    },
  })
}
