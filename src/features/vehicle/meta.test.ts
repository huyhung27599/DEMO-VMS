import { describe, expect, it } from 'vitest'
import { today } from '../dashboard/lib'
import { buildVehicleMeta } from './meta'

const T = today()

describe('buildVehicleMeta', () => {
  const vehicles = [
    { nm: '51A', dl: [{ id: 'D1' }] },
    { nm: '30M', dl: [{ id: 'D2' }] },
    { nm: '29B', dl: [] },
  ]

  it('gộp status/mileage/events/driverMap theo biển số và mã thiết bị', () => {
    const meta = buildVehicleMeta(
      vehicles,
      [
        { id: 'D1', vid: '51A', ol: 1, sp: 456, net: 3, sn: 9 },
        { id: 'D2', ol: 1, sp: 0, dn: 'Tài xế B' },
      ],
      [{ vehIdno: '51A', mile: 12345 }, { vehiIdno: '30M', mileage: '7' }],
      [
        { alarmType: 618, vehiIdno: '51A', fileTime: `${T} 08:00:00` },
        { alarmType: 620, did: 'D1', fileTime: '2000-01-01 07:00:00' },
      ],
      { '51A': 'Tài xế A' },
    )
    expect(meta['51A']).toMatchObject({
      driver: 'Tài xế A',
      status: 'alert',
      speed: 45.6,
      todayKm: 12.3,
      alertCount: 1,
      firmware: '4G · 9 vệ tinh',
    })
    expect(meta['51A'].alerts.map((a) => a.type)).toHaveLength(2)
    expect(meta['30M']).toMatchObject({ driver: 'Tài xế B', status: 'online', speed: 0, todayKm: 7, alertCount: 0 })
    // không có status → offline, không bịa số liệu
    expect(meta['29B']).toMatchObject({ status: 'offline', speed: null, todayKm: null, driver: null, firmware: '—' })
  })
})
