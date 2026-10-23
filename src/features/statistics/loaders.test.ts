import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    queryUserVehicle: vi.fn(),
    querySafetyAlarm: vi.fn(),
    performanceReportPhotoListSafe: vi.fn(),
    runMileage: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import { ALARM_IDS, formatDt } from './lib'
import { fetchMileageStats, fetchSafetyAlarmRange, loadStatistics } from './loaders'
import { resetStatisticsStore, useStatisticsStore } from './store'
import { useLoaderStore } from '../../shared/ui/loaderStore'

const m = {
  queryUserVehicle: vi.mocked(api.queryUserVehicle),
  querySafetyAlarm: vi.mocked(api.querySafetyAlarm),
  evidence: vi.mocked(api.performanceReportPhotoListSafe),
  runMileage: vi.mocked(api.runMileage),
}

const start = new Date(2024, 2, 15, 0, 0, 0)
const end = new Date(2024, 2, 16, 0, 0, 0)

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset())
  resetStatisticsStore()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('fetchMileageStats', () => {
  it('đọc infos[].mile (mét) theo phản hồi thật của 808gps', async () => {
    m.runMileage.mockResolvedValue({ result: 0, infos: [{ mile: 12500 }, { mile: 2500 }] })
    expect((await fetchMileageStats([{ vehiIdno: 'A' }], start, end)).totalKm).toBe(15)
  })

  it('trả { totalKm: 0, kmPer100: 0 } khi không có xe, không gọi API', async () => {
    expect(await fetchMileageStats([], start, end)).toEqual({ totalKm: 0, kmPer100: 0 })
    expect(m.runMileage).not.toHaveBeenCalled()
  })

  it('cộng mileage của từng xe (bỏ xe không có id), kmPer100 = số vi phạm × 100 / totalKm', async () => {
    useStatisticsStore.setState({ allEvents: [{}, {}, {}] })
    m.runMileage.mockImplementation(async (v: string) => {
      if (v === 'A') return { result: 0, datas: [{ mileage: '10.5' }, { mileage: null }] }
      if (v === 'B') return { result: 0, datas: [{ mileage: 4.5 }] }
      return { result: 1 }
    })
    const r = await fetchMileageStats([{ vehiIdno: 'A' }, { nm: 'B' }, {}, { id: 'C' }], start, end)
    expect(r).toEqual({ totalKm: 15, kmPer100: 20 })
    expect(m.runMileage.mock.calls).toEqual([
      ['A', formatDt(start), formatDt(end)],
      ['B', formatDt(start), formatDt(end)],
      ['C', formatDt(start), formatDt(end)],
    ])
  })

  it('totalKm = 0 -> kmPer100 = 0', async () => {
    useStatisticsStore.setState({ allEvents: [{}] })
    m.runMileage.mockResolvedValue({ result: 0, datas: [] })
    expect(await fetchMileageStats([{ vehiIdno: 'A' }], start, end)).toEqual({ totalKm: 0, kmPer100: 0 })
  })
})

describe('fetchSafetyAlarmRange', () => {
  it('phân trang 200 bản ghi, dừng khi trang thiếu; không bổ sung khi đủ mã hợp lệ', async () => {
    const page1 = Array.from({ length: 200 }, (_, i) => ({ devIdno: 'D', stm: 1000 + i, atp: 620 }))
    const page2 = [{ devIdno: 'D', stm: 5000, atp: 622 }]
    m.querySafetyAlarm.mockResolvedValueOnce({ result: 0, alarms: page1 }).mockResolvedValueOnce({ result: 0, alarms: page2 })
    const rows = await fetchSafetyAlarmRange(start, end)
    expect(rows).toHaveLength(201)
    expect(m.querySafetyAlarm.mock.calls).toEqual([
      [formatDt(start), formatDt(end), ALARM_IDS, '', 1, 200],
      [formatDt(start), formatDt(end), ALARM_IDS, '', 2, 200],
    ])
    expect(m.evidence).not.toHaveBeenCalled()
  })

  it('không có dòng -> bổ sung từ querySafetyEvidence (mediaType "0"), loại trùng', async () => {
    m.querySafetyAlarm.mockResolvedValue({ result: 1 })
    m.evidence.mockResolvedValue({
      result: 0,
      infos: [
        { alarmType: 621, fileTime: 1700000000, devIdno: 'D', fileUrl: 'u1' },
        { alarmType: 621, fileTime: 1700000000, devIdno: 'D', fileUrl: 'u1' },
        { alarmType: 'abc' },
      ],
    })
    const rows = await fetchSafetyAlarmRange(start, end)
    expect(m.evidence).toHaveBeenCalledWith(formatDt(start), formatDt(end), ALARM_IDS, '0', '', '')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ atp: 621, stm: 1700000000, typeName: 'Nghe điện thoại', armUrl: 'u1' })
  })
})

describe('loadStatistics', () => {
  it('thứ tự gọi: queryUserVehicle -> querySafetyAlarm -> runMileage; cập nhật KPI/bảng; bật/tắt loader', async () => {
    const order: string[] = []
    m.queryUserVehicle.mockImplementation(async () => {
      order.push('vehicles')
      expect(useLoaderStore.getState().visible).toBe(true)
      return { result: 0, vehicles: [{ nm: '29A', vehiIdno: '29A', dl: [{ id: 'D1' }] }, { nm: '30B' }] }
    })
    m.querySafetyAlarm.mockImplementation(async () => {
      order.push('alarm')
      return {
        result: 0,
        alarms: [
          { devIdno: 'D1', atp: 620, stm: 1700000000 },
          { devIdno: 'D1', atp: 621, stm: 1700000100 },
        ],
      }
    })
    m.runMileage.mockImplementation(async () => {
      order.push('mileage')
      return { result: 0, datas: [{ mileage: 100 }] }
    })
    await loadStatistics()
    expect(order).toEqual(['vehicles', 'alarm', 'mileage', 'mileage'])
    const s = useStatisticsStore.getState()
    expect(s.allEvents.map((e) => e.stm)).toEqual([1700000100, 1700000000])
    expect(s.allEvents[0].vehicleName).toBe('29A')
    expect(s.kpis).toEqual({
      total: 2,
      avgScore: '98.0',
      per100: '1.00',
      safetyRate: '50.0%',
      safeDrivers: 1,
      topViolation: 'Nghe điện thoại L1',
      topPct: '50.0',
    })
    expect(s.table?.items).toHaveLength(2)
    expect(s.table).toMatchObject({ page: 1, totalPages: 1, prevDisabled: true, nextDisabled: true })
    expect(s.leaderboard).toEqual({ type: 'best', items: [['29A', 2]] })
    expect(useLoaderStore.getState().visible).toBe(false)
  })

  it('khoảng thời gian: currentPeriod ngày tính tới hiện tại; tùy chọn dùng customStart/EndDate', async () => {
    m.queryUserVehicle.mockResolvedValue({ result: 0, vehicles: [] })
    m.querySafetyAlarm.mockResolvedValue({ result: 0, alarms: [{ atp: 620 }] })
    vi.useFakeTimers({ now: new Date(2024, 2, 20, 12, 0, 0) })
    try {
      useStatisticsStore.setState({ currentPeriod: 7 })
      await loadStatistics()
      expect(m.querySafetyAlarm.mock.calls[0].slice(0, 2)).toEqual([
        formatDt(new Date(2024, 2, 13, 12, 0, 0)),
        formatDt(new Date(2024, 2, 20, 12, 0, 0)),
      ])
      useStatisticsStore.setState({ isCustomDate: true, customStartDate: start, customEndDate: end })
      await loadStatistics()
      expect(m.querySafetyAlarm.mock.calls[1].slice(0, 2)).toEqual([formatDt(start), formatDt(end)])
    } finally {
      vi.useRealTimers()
    }
  })

  it('lỗi -> console.error("Error loading stats", e) và vẫn tắt loader', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    m.queryUserVehicle.mockRejectedValue(new Error('boom'))
    await loadStatistics()
    expect(err).toHaveBeenCalledWith('Error loading stats', expect.any(Error))
    expect(useLoaderStore.getState().visible).toBe(false)
  })
})
