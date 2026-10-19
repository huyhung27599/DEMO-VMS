import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
vi.mock('../../shared/api/endpoints', () => ({
  api: {
    queryUserVehicle: vi.fn(async () => {
      calls.push('queryUserVehicle')
      return {
        result: 0,
        vehicles: [
          { nm: 'AAA', vehiIdno: 'AAA', devIdno: 'd1' },
          { nm: 'BBB', vehiIdno: 'BBB', devIdno: 'd2' },
        ],
      }
    }),
    getDeviceStatus: vi.fn(async () => {
      calls.push('getDeviceStatus')
      return { result: 0, status: [{ id: 'd1', ol: 1, sp: 100 }] }
    }),
    getDeviceOlStatus: vi.fn(async () => {
      calls.push('getDeviceOlStatus')
      return { result: 0, onlines: [] }
    }),
    syncAiEventsLocal: vi.fn(async () => {
      calls.push('syncAiEventsLocal')
      return { result: 0, events: [] }
    }),
    runMileage: vi.fn(async (v: string) => {
      calls.push(`runMileage:${v}`)
      return { result: 0, datas: [{ mileage: '12.5' }] }
    }),
  },
}))

import { BASE_URL } from '../../shared/api/client'
import { dashboardKeys } from './queries'
import { loadVehicleStatus, refresh, resetDashboardModuleState } from './loaders'
import { resetDashboardStore, useDashboardStore } from './store'

describe('refresh() - thứ tự gọi API của dashboard.js:678', () => {
  const fetchMock = vi.fn(async (url: string) => {
    calls.push(`fetch:${url}`)
    return { ok: true, json: async () => ({ d1: 'Tài xế A' }) }
  })

  beforeEach(() => {
    calls.length = 0
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
    resetDashboardModuleState()
    resetDashboardStore()
  })

  it('loadVehicles + loadDriverMapping -> (loadVehicleStatus) -> loadAlarms + loadMileage', async () => {
    await refresh()
    expect(calls.slice(0, 5)).toEqual([
      'queryUserVehicle',
      `fetch:${BASE_URL}driver/mapping`,
      'getDeviceStatus',
      'getDeviceOlStatus',
      'syncAiEventsLocal',
    ])
    expect(calls.slice(5).sort()).toEqual(['runMileage:AAA', 'runMileage:BBB'])
  })

  it('loadDriverMapping gọi fetch(BASE_URL + "driver/mapping") không kèm tham số khác', async () => {
    await refresh()
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}driver/mapping`)
  })

  it('cập nhật KPI/bảng sau refresh và tắt trạng thái spinning', async () => {
    await refresh()
    const s = useDashboardStore.getState()
    expect(s.kpi.total).toBe(2)
    expect(s.kpi.online).toBe(1)
    expect(s.kpi.offline).toBe(1)
    expect(s.kpi.moving).toBe(1) // sp 100 -> 10 km/h > 3
    expect(s.onlinePct).toBe(50)
    expect(s.kpi.alarms).toBe(0)
    expect(s.kpi.mileage).toBe('25')
    expect(s.tableCount).toBe('2 phương tiện')
    expect(s.tableRows?.map((r) => r.badge.kind)).toEqual(['moving', 'offline'])
    expect(s.lastUpdated).toMatch(/^Cập nhật lúc: \d\d:\d\d:\d\d$/)
    expect(s.refreshing).toBe(false)
  })

  it('loadVehicleStatus giữ nguyên bộ lọc đang gõ ở ô tìm kiếm', async () => {
    await refresh()
    useDashboardStore.setState({ searchText: 'bb' })
    await loadVehicleStatus()
    expect(useDashboardStore.getState().tableRows?.map((r) => r.plate)).toEqual(['BBB'])
  })

  it('khóa query bắt đầu bằng "dashboard" để RootLayout refetchQueries khớp', () => {
    expect(dashboardKeys.refresh[0]).toBe('dashboard')
    expect(dashboardKeys.realtimeAlarms[0]).toBe('dashboard')
  })
})
