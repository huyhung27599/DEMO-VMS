import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/api/endpoints', () => ({
  api: { syncAiEventsLocal: vi.fn(), queryDriverList: vi.fn() },
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
        { alarmType: 2, vehiIdno: 'B', fileTime: `${T} 09:00:00` },
        { alarmType: '620', vi: 'C', fileTime: `${T} 10:00:00` },
        { ty: 622, did: 'D', actualTime: '2000-01-01 00:00:00' },
        { armType: 624, vehicleName: 'E', updateTime: `${T} 07:00:00` },
        { alarmType: 605, vehiIdno: 'F', fileTime: `${T} 11:00:00` },
      ],
    })
    await loadAlarms()
    const got = getCachedAlarms()
    expect(got.map((a) => a.armType)).toEqual(['620', 618, 624, 622])
    expect(got.map((a) => a.vehiIdno)).toEqual(['C', 'A', 'E', ''])
    expect(got[3].devIdno).toBe('D')
    expect(got[1].guid).toBe('ai-1')
  })

  it('KPI cảnh báo hôm nay + bảng mới nhất tối đa 8; delta so với số sự kiện hôm qua', async () => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const Y = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    const events = Array.from({ length: 11 }, (_, i) => ({
      alarmType: 618,
      vehiIdno: `V${i}`,
      fileTime: `${i < 8 ? T : i < 10 ? Y : '2000-01-01'} 0${i % 10}:00:00`,
    }))
    sync.mockResolvedValue({ result: 0, events })
    await loadAlarms()
    const s = useDashboardStore.getState()
    expect(s.kpi.alarmsToday).toBe(8)
    expect(s.kpi.alarmsDelta).toBe(8 - 2)
    expect(s.latestAlerts).toHaveLength(8)
    expect(s.latestAlerts[0].plate).toBe('V7')
    expect(s.latestAlerts[0].level).toBe('high')
    expect(s.alarmTypeBars.length).toBeGreaterThan(0)
    expect(s.topVehicles[0]?.plate).toBeDefined()
  })

  it('result khác 0 hoặc events không phải mảng -> KPI 0, bảng/biểu đồ rỗng', async () => {
    sync.mockResolvedValue({ result: 5 })
    await loadAlarms()
    expect(useDashboardStore.getState().kpi.alarmsToday).toBe(0)
    expect(useDashboardStore.getState().latestAlerts).toEqual([])
    expect(useDashboardStore.getState().alarmTypeBars).toEqual([])
  })

  it('lỗi API -> KPI "0" (chuỗi) như bản gốc', async () => {
    sync.mockRejectedValue(new Error('boom'))
    await loadAlarms()
    expect(useDashboardStore.getState().kpi.alarmsToday).toBe('0')
  })
})

describe('pollRealtimeAlarms', () => {
  it('chạy loadAlarms (cùng một lần gọi API) và cập nhật KPI', async () => {
    sync.mockResolvedValue({ result: 0, events: [{ alarmType: 618, vehiIdno: 'A', fileTime: `${T} 01:00:00` }] })
    await pollRealtimeAlarms()
    expect(useDashboardStore.getState().kpi.alarmsToday).toBe(1)
  })

  it('lỗi -> KPI không đổi từ loadAlarms catch', async () => {
    sync.mockRejectedValue(new Error('x'))
    await pollRealtimeAlarms()
    expect(useDashboardStore.getState().kpi.alarmsToday).toBe('0')
  })
})
