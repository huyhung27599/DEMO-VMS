import { describe, expect, it } from 'vitest'
import { toDeviceStatusItems } from './deviceStatus'

describe('toDeviceStatusItems', () => {
  it('map getDeviceStatus + getLoadDeviceInfo', () => {
    const items = toDeviceStatusItems(
      { ol: 1, sn: 9, net: 3, dn: 'Nguyễn A' },
      { AllVolume: 1000, LeftVolume: 250 },
    )
    expect(items.map((i) => [i.id, i.value, i.tone])).toEqual([
      ['gps', '9 vệ tinh', 'ok'],
      ['signal', '4G', 'ok'],
      ['server', 'Đã kết nối', 'ok'],
      ['storage', '75%', 'warn'],
      ['driver', 'Nguyễn A', 'ok'],
    ])
  })

  it('không có dữ liệu → "—", không bịa số', () => {
    expect(toDeviceStatusItems(null, null).map((i) => i.value)).toEqual(['—', '—', '—', '—', '—'])
  })
})
