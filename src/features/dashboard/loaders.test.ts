import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/api/endpoints', () => ({
  api: { syncAiEventsLocal: vi.fn() },
}))

import { api } from '../../shared/api/endpoints'
import { loadAlarms, pollRealtimeAlarms, getCachedAlarms, resetDashboardModuleState } from './loaders'
import { today } from './lib'
import { resetDashboardStore, useDashboardStore } from './store'

const sync = vi.mocked(api.syncAiEventsLocal)
const T = today()

beforeEach(() => {
  sync.mockReset()
  resetDashboardModuleState()
  resetDashboardStore()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('loadAlarms', () => {
  it('gọi syncAiEventsLocal("", "")', async () => {
    sync.mockResolvedValue({ result: 0, events: [] })
    await loadAlarms()
    expect(sync).toHaveBeenCalledWith('', '')
  })

  it('chỉ giữ loại 618/620/622/624 (so sánh theo chuỗi, ưu tiên alarmType ?? ty ?? armType), sắp xếp begintime giảm dần', async () => {
    sync.mockResolvedValue({
      result: 0,
      events: [
        { alarmType: 618, vehiIdno: 'A', fileTime: `${T} 08:00:00`, id: 1 },
        { alarmType: 2, vehiIdno: 'B', fileTime: `${T} 09:00:00` }, // loại
        { alarmType: '620', vi: 'C', fileTime: `${T} 10:00:00` },
        { ty: 622, did: 'D', actualTime: '2000-01-01 00:00:00' },
        { armType: 624, vehicleName: 'E', updateTime: `${T} 07:00:00` },
        { alarmType: 605, vehiIdno: 'F', fileTime: `${T} 11:00:00` }, // loại
      ],
    })
    await loadAlarms()
    const got = getCachedAlarms()
    expect(got.map((a) => a.armType)).toEqual(['620', 618, 624, 622])
    expect(got.map((a) => a.vehiIdno)).toEqual(['C', 'A', 'E', ''])
    expect(got[3].devIdno).toBe('D')
    expect(got[1].guid).toBe('ai-1')
  })

  it('KPI "Báo động hôm nay" đếm begintime bắt đầu bằng ngày hôm nay; feed tối đa 5 mục', async () => {
    const events = Array.from({ length: 7 }, (_, i) => ({
      alarmType: 618,
      vehiIdno: `V${i}`,
      fileTime: `${i < 6 ? T : '2000-01-01'} 0${i}:00:00`,
    }))
    sync.mockResolvedValue({ result: 0, events })
    await loadAlarms()
    const s = useDashboardStore.getState()
    expect(s.kpi.alarms).toBe(6)
    expect(s.alarmItems).toHaveLength(5)
    expect(s.alarmItems[0].title).toBe('DSM - Lái xe mệt mỏi - V5')
    expect(s.alarmItems[0].sev).toBe('warning')
  })

  it('result khác 0 hoặc events không phải mảng -> danh sách rỗng, KPI 0, feed rỗng', async () => {
    sync.mockResolvedValue({ result: 5 })
    await loadAlarms()
    expect(useDashboardStore.getState().kpi.alarms).toBe(0)
    expect(useDashboardStore.getState().alarmItems).toEqual([])
  })

  it('lỗi API -> KPI "0" (chuỗi) như bản gốc', async () => {
    sync.mockRejectedValue(new Error('boom'))
    await loadAlarms()
    expect(useDashboardStore.getState().kpi.alarms).toBe('0')
  })
})

describe('pollRealtimeAlarms', () => {
  it('chạy loadAlarms (cùng một lần gọi API) và cập nhật KPI', async () => {
    sync.mockResolvedValue({ result: 0, events: [{ alarmType: 618, vehiIdno: 'A', fileTime: `${T} 01:00:00` }] })
    await pollRealtimeAlarms()
    expect(sync).toHaveBeenCalledTimes(1)
    expect(useDashboardStore.getState().kpi.alarms).toBe(1)
  })

  it('lỗi API không ném ra ngoài, KPI "0"', async () => {
    sync.mockRejectedValue(new Error('x'))
    await expect(pollRealtimeAlarms()).resolves.toBeUndefined()
    expect(useDashboardStore.getState().kpi.alarms).toBe('0')
  })
})
