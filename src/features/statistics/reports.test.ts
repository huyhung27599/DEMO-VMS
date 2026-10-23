import { describe, expect, it } from 'vitest'
import { drivingRow, fmtDuration, mileKm, speedRow, stopRows, summaryRow, tripRows } from './reports'

describe('report mappers', () => {
  it('mileKm: doc mile (mét) và bản cũ mileage (km)', () => {
    expect(mileKm({ mile: 12500 })).toBe(12.5)
    expect(mileKm({ mileage: '7' })).toBe(7)
    expect(mileKm({})).toBe(0)
  })

  it('trips: mỗi dòng runMileage → một hàng', () => {
    expect(tripRows('51A', 'An', [{ mile: 98000, sTimeStr: '2026-06-08 06:10:00', eTimeStr: '2026-06-08 09:42:00' }])).toEqual([
      ['51A', 'An', '08/06 06:10', '08/06 09:42', '—', '—', '98.0 km'],
    ])
  })

  it('speed: max từ ssp/esp ÷10, số lần ưu tiên pagination.totalRecords', () => {
    expect(speedRow('51A', '—', [{ ssp: 880, esp: 700 }, { ssp: 650 }], 5)).toEqual(['51A', '—', '—', '88 km/h', '5'])
    expect(speedRow('51A', '—', [])).toEqual(['51A', '—', '—', '—', '0'])
  })

  it('driving: tổng ttime, vi phạm khi một ngày > 10h', () => {
    expect(drivingRow('51A', '—', [{ ttime: 3600 * 11 }, { ttime: 1800 }])).toEqual(['51A', '—', '—', '11g 30p', 'Có'])
    expect(drivingRow('51A', '—', [])[4]).toBe('—')
  })

  it('stops: parkDetail infos (ms + giây)', () => {
    const t = new Date(2026, 5, 8, 9, 50).getTime()
    expect(stopRows('51A', '—', [{ armTimeStart: t, startPosition: 'Vũng Tàu', alarmTotalTime: 1500 }])).toEqual([
      ['51A', '—', '08/06 09:50', 'Vũng Tàu', '25 phút'],
    ])
  })

  it('summary + fmtDuration', () => {
    expect(summaryRow('51A', 840, 5, 3)).toEqual(['51A', '—', '840.0 km', '5', '3'])
    expect(summaryRow('51A', null, null, 0)).toEqual(['51A', '—', '—', '—', '0'])
    expect(fmtDuration(0)).toBe('—')
  })
})
