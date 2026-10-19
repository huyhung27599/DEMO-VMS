import { describe, expect, it } from 'vitest'
import {
  buildSavePayload,
  deriveCompanies,
  extractDevId,
  filterVehicles,
  getVehicleTypeClass,
  getVehicleTypeLabel,
  normalizeVehicle,
} from './lib'

describe('extractDevId (vehicle.js:340)', () => {
  it.each([
    [null, '--'],
    [undefined, '--'],
    [{}, '--'],
    [{ devIdno: 'D1' }, 'D1'],
    [{ devIdno: 'D1', dl: [{ id: 'X' }] }, 'D1'],
    [{ dl: [{ id: 'X' }] }, 'X'],
    [{ dl: [{ devIdno: 'Y' }] }, 'Y'],
    [{ dl: [{ id: 'X', devIdno: 'Y' }, { id: 'Z' }] }, 'X'],
    [{ dl: [{}] }, '--'],
    [{ dl: [] }, '--'],
    [{ dl: 'abc' }, '--'],
  ])('%j -> %s', (v, expected) => {
    expect(extractDevId(v as never)).toBe(expected)
  })
})

describe('getVehicleTypeLabel (vehicle.js:350)', () => {
  it.each([
    ['1', 'Xe con'],
    ['2', 'Xe tải'],
    ['3', 'Xe khách'],
    ['4', 'Xe container'],
    [2, 'Xe tải'],
    ['9', 'Chưa phân loại'],
    ['', 'Chưa phân loại'],
    [undefined, 'Chưa phân loại'],
    [null, 'Chưa phân loại'],
  ])('%j -> %s', (t, expected) => {
    expect(getVehicleTypeLabel(t as never)).toBe(expected)
  })
})

describe('getVehicleTypeClass (vehicle.js:360)', () => {
  it.each([
    ['1', 'badge-car'],
    ['2', 'badge-truck'],
    ['3', 'badge-bus'],
    ['4', 'badge-container'],
    [3, 'badge-bus'],
    ['9', ''],
    [undefined, ''],
  ])('%j -> %j', (t, expected) => {
    expect(getVehicleTypeClass(t as never)).toBe(expected)
  })
})

describe('normalizeVehicle (vehicle.js:127)', () => {
  it('lấy nm / pid / pnm / dl[0].id', () => {
    const v = normalizeVehicle({ nm: 'A1', pid: 'p', pnm: 'Công ty', dl: [{ id: 'd9' }] })
    expect(v).toMatchObject({ vehiIdno: 'A1', plate: 'A1', companyId: 'p', companyName: 'Công ty', devIdno: 'd9' })
  })
  it('thiếu hết -> chuỗi rỗng, devIdno là "--" (extractDevId trả chuỗi truthy)', () => {
    const v = normalizeVehicle({})
    expect(v).toMatchObject({ vehiIdno: '', plate: '', companyId: '', companyName: '', devIdno: '--' })
  })
})

describe('deriveCompanies (vehicle.js:146)', () => {
  it('gom theo id -> tên, bỏ qua thiếu id hoặc tên', () => {
    const list = deriveCompanies(
      [
        { companyId: 'a', companyName: 'A' },
        { pid: 'b', pnm: 'B' },
        { groupId: 'c', groupName: 'C' },
        { parentId: 'd', parentName: 'D' },
        { companyId: 'e' },
        { companyName: 'F' },
        { companyId: 'a', companyName: 'A2' },
      ],
      'user',
    )
    expect(list).toEqual([
      { id: 'a', name: 'A2' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
      { id: 'd', name: 'D' },
    ])
  })
  it('không có dữ liệu đơn vị -> dùng tên đăng nhập', () => {
    expect(deriveCompanies([{ nm: 'x' }], 'admin')).toEqual([{ id: 'admin', name: 'admin' }])
  })
  it('không có cả tên đăng nhập -> rỗng', () => {
    expect(deriveCompanies([], '')).toEqual([])
  })
})

describe('filterVehicles (vehicle.js:190)', () => {
  const list = [{ plate: '29A-111', devIdno: 'DEV1' }, { nm: '30B-222', dl: [{ id: 'dev2' }] }, { vehiIdno: '51C-333' }]
  it('rỗng -> tất cả', () => expect(filterVehicles(list, '')).toHaveLength(3))
  it('trim + không phân biệt hoa thường theo biển số', () => {
    expect(filterVehicles(list, '  30b ')).toEqual([list[1]])
  })
  it('khớp ID thiết bị', () => expect(filterVehicles(list, 'DEV')).toEqual([list[0], list[1]]))
  it('xe không có thiết bị khớp "--" (hành vi gốc)', () => {
    expect(filterVehicles(list, '--')).toEqual([list[2]])
  })
})

describe('buildSavePayload (vehicle.js:270)', () => {
  it('đủ 5 trường theo thứ tự form', () => {
    expect(buildSavePayload({ vehiIdno: 'A', devIdno: 'D', vehiType: '2', vehiColor: 'Đỏ', companyId: 'c' })).toEqual({
      vehiIdno: 'A',
      devIdno: 'D',
      vehiType: '2',
      vehiColor: 'Đỏ',
      companyId: 'c',
    })
  })
  it('loại xe rỗng (select không có lựa chọn) bị bỏ như FormData', () => {
    const p = buildSavePayload({ vehiIdno: 'A', devIdno: 'D', vehiType: '', vehiColor: '', companyId: '' })
    expect(p).toEqual({ vehiIdno: 'A', devIdno: 'D', vehiColor: '', companyId: '' })
    expect('vehiType' in p).toBe(false)
  })
})
