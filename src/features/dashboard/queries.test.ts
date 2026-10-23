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
    queryDriverList: vi.fn(async () => {
      calls.push('queryDriverList')
      return { result: 0, infos: [{ dn: 'A' }, { dn: 'B' }, { dn: 'C' }, { dn: 'D' }] }
    }),
  },
}))

import { BASE_URL } from '../../shared/api/client'
import { dashboardKeys } from './queries'
import { loadVehicleStatus, refresh, resetDashboardModuleState } from './loaders'
import { resetDashboardStore, useDashboardStore } from './store'

describe('refresh() - API thật', () => {
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

  it('loadVehicles + loadDriverMapping -> loadAlarms + loadDriversKpi (không gọi mileage)', async () => {
    await refresh()
    expect(calls).toEqual(
      expect.arrayContaining([
        'queryUserVehicle',
        `fetch:${BASE_URL}driver/mapping`,
        'getDeviceStatus',
        'getDeviceOlStatus',
        'syncAiEventsLocal',
        'queryDriverList',
      ]),
    )
    expect(calls.some((c) => c.startsWith('runMileage'))).toBe(false)
  })

  it('loadDriverMapping gọi fetch(BASE_URL + "driver/mapping")', async () => {
    await refresh()
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}driver/mapping`)
  })

  it('cập nhật KPI sau refresh (xe/online/tài xế/thiết bị thật)', async () => {
    await refresh()
    const s = useDashboardStore.getState()
    expect(s.kpi.totalVehicles).toBe(2)
    expect(s.kpi.onlineVehicles).toBe(1)
    expect(s.kpi.alarmsToday).toBe(0)
    expect(s.kpi.totalDrivers).toBe(4)
    // getDeviceStatus trả 1 thiết bị online
    expect(s.kpi.devicesOnline).toBe(1)
    expect(s.kpi.devicesTotal).toBe(1)
    expect(s.kpi.devicesLost).toBe(0)
    expect(s.lastUpdated).toMatch(/^Tổng quan vận hành đội xe - Cập nhật lúc \d\d:\d\d$/)
    expect(s.refreshing).toBe(false)
  })

  it('loadVehicleStatus cập nhật online sau khi đã có xe', async () => {
    await refresh()
    await loadVehicleStatus()
    expect(useDashboardStore.getState().kpi.onlineVehicles).toBe(1)
  })

  it('khóa query bắt đầu bằng "dashboard" để RootLayout refetchQueries khớp', () => {
    expect(dashboardKeys.refresh[0]).toBe('dashboard')
    expect(dashboardKeys.realtimeAlarms[0]).toBe('dashboard')
  })
})
