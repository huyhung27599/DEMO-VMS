import { describe, expect, it } from 'vitest'
import {
  ALARM_IDS,
  alarmTypeMatchesFilter,
  dedupeAlarmRows,
  exportCSV,
  formatDt,
  getAlarmCode,
  getApiSeverity,
  getEventTimeSec,
  getFilteredEvents,
  getViolationDisplayName,
  inferAlarmCodeFromName,
  isSbacString,
  needsEvidenceSupplement,
  normalizeAlarmEvent,
  normalizeCoord,
  normalizeSpeed,
  parseAlarmCodeFromSbacString,
  parseAlarmCodeValue,
  parseGpsStatusSpeed,
  parsePositionString,
  toNum,
} from './lib'

describe('ALARM_IDS', () => {
  it('liệt kê mã theo thứ tự khóa của object gốc (số tăng dần)', () => {
    expect(ALARM_IDS.startsWith('190,600,601,')).toBe(true)
    expect(ALARM_IDS.endsWith('636,639,640,643')).toBe(true)
  })
})

describe('formatDt', () => {
  it('ngày theo UTC (toISOString) + giờ local (toTimeString) — giữ nguyên bản gốc', () => {
    const d = new Date(2024, 2, 15, 8, 30, 5)
    expect(formatDt(d)).toBe(`${d.toISOString().split('T')[0]} 08:30:05`)
  })
})

describe('toNum', () => {
  it.each([
    ['5', 5],
    ['abc', null],
    [null, 0],
    [undefined, null],
    [Infinity, null],
    ['', 0],
  ])('%s -> %s', (v, out) => expect(toNum(v)).toBe(out))
})

describe('normalizeCoord', () => {
  it.each([
    [106700000, 106.7],
    [21.5, 21.5],
    ['x', null],
    [-2000, -0.002],
  ])('%s -> %s', (v, out) => expect(normalizeCoord(v)).toBe(out))
})

describe('normalizeSpeed', () => {
  it.each([
    [600, 60],
    [50, 50],
    [123450, 12.345],
    [null, 0],
    ['a', null],
    [250, 250],
  ])('%s -> %s', (v, out) => expect(normalizeSpeed(v)).toBe(out))
})

describe('parseGpsStatusSpeed', () => {
  it.each([
    [null, null],
    [123, null],
    ['a|b|c|d|e|f|g|h|i|550', 55],
    ['1|2|45', 45],
    ['1|2|300', 30],
    ['1|2|0', null],
    ['1|2|220', null],
    ['1|2|3|4|5|6|7|8|0|0|150000', 15],
    ['1|2|3|4|5|6|7|8|9|0|150000', 9],
  ])('%s -> %s', (v, out) => expect(parseGpsStatusSpeed(v)).toBe(out))
})

describe('parsePositionString', () => {
  it.each([
    ['21.0285, 105.8542', { lat: 21.0285, lng: 105.8542 }],
    ['105.85;21.02', { lat: 21.02, lng: 105.85 }],
    ['abc', { lat: null, lng: null }],
    [null, { lat: null, lng: null }],
    [12, { lat: null, lng: null }],
  ])('%s', (v, out) => expect(parsePositionString(v)).toEqual(out))
})

describe('getViolationDisplayName', () => {
  it.each([
    [null, 'Vi phạm an toàn'],
    [{ atp: 621 }, 'Nghe điện thoại'],
    [{ typeName: 'Cảnh báo X L2' }, 'Cảnh báo X'],
    [{ typeName: 'abc (12)' }, 'abc'],
    [{ typeName: 'Cảnh báo AI' }, 'Vi phạm an toàn'],
    [{ typeName: 'SBAC=ABCDEFGHIJKLMNOPQRSTUVWXYZ' }, 'Vi phạm an toàn'],
    [{ atp: 650 }, 'Vi phạm mã 650'],
    [{ alarmName: 'Driver sleeping' }, 'Driver sleeping'],
    [{ alarmName: 'Driver smoking' }, 'Hút thuốc'],
    [{ desc: 'SBAC=000000000190' }, 'Ngáp'],
  ])('%j -> %s', (e, out) => expect(getViolationDisplayName(e)).toBe(out))
})

describe('isSbacString', () => {
  it.each([
    [' sbac=123', true],
    ['SBA', false],
    [5, false],
  ])('%s -> %s', (v, out) => expect(isSbacString(v)).toBe(out))
})

describe('parseAlarmCodeFromSbacString', () => {
  it.each([
    ['SBAC=000000000618', 618],
    ['SBAC=12345', null],
    ['SBAC=999999999999', null],
    ['000000000618', null],
    ['SBAC=111111000643', 643],
    [null, null],
  ])('%s -> %s', (v, out) => expect(parseAlarmCodeFromSbacString(v)).toBe(out))
})

describe('parseAlarmCodeValue', () => {
  it.each([
    [undefined, null],
    ['', null],
    ['620', 620],
    [620, 620],
    ['L2', null],
    ['abc', null],
    ['0', null],
    ['1500', null],
    ['45', 45],
    ['SBAC=000000000618', 618],
    ['620abc', null],
  ])('%s -> %s', (v, out) => expect(parseAlarmCodeValue(v)).toBe(out))
})

describe('inferAlarmCodeFromName', () => {
  it.each([
    [{ typeName: 'Hút thuốc lá' }, 622],
    [{ alarmName: 'Yawn detected' }, 190],
    [{ typeName: 'Phone call' }, 620],
    [{}, null],
    [{ typeName: 'Không rõ' }, null],
  ])('%j -> %s', (e, out) => expect(inferAlarmCodeFromName(e)).toBe(out))
})

describe('getAlarmCode', () => {
  it.each([
    [null, ''],
    [{ ATP: '621' }, '621'],
    [{ desc: 'SBAC=000000000190' }, '190'],
    [{ typeName: 'phone call' }, '620'],
    [{}, ''],
    [{ alarmType: 'SBAC=000000000618', ty: 600 }, '618'],
    [{ atp: 'xyz', ty: 604 }, '604'],
  ])('%j -> %s', (e, out) => expect(getAlarmCode(e)).toBe(out))
})

describe('getEventTimeSec', () => {
  it('giây / mili giây / chuỗi số', () => {
    expect(getEventTimeSec({ stm: 1700000000 })).toBe(1700000000)
    expect(getEventTimeSec({ stm: 1700000000123 })).toBe(1700000000)
    expect(getEventTimeSec({ st: '1700000000.7' })).toBe(1700000000)
  })
  it('chuỗi ngày dd/mm/yyyy và yyyy-mm-dd (giờ local)', () => {
    expect(getEventTimeSec({ begintime: '15/03/2024 08:30' })).toBe(
      Math.floor(new Date(2024, 2, 15, 8, 30, 0).getTime() / 1000),
    )
    expect(getEventTimeSec({ begintime: '2024-03-15 08:30:00' })).toBe(
      Math.floor(new Date(2024, 2, 15, 8, 30, 0).getTime() / 1000),
    )
  })
  it('không có / không đọc được -> 0; stm rỗng -> 0 dù có begintime (quirk gốc)', () => {
    expect(getEventTimeSec({})).toBe(0)
    expect(getEventTimeSec({ begintime: 'garbage' })).toBe(0)
    expect(getEventTimeSec({ stm: '', begintime: '2024-03-15 08:30:00' })).toBe(0)
  })
  it('Date', () => {
    const d = new Date(2024, 0, 1)
    expect(getEventTimeSec({ startTime: d })).toBe(Math.floor(d.getTime() / 1000))
  })
})

describe('getApiSeverity', () => {
  it.each([
    [{ level: 3 }, { text: 'Trầm trọng', color: '#ef4444' }],
    [{ level: '2' }, { text: 'Trung bình', color: '#f59e0b' }],
    [{ level: 0 }, { text: 'Nhẹ', color: '#3b82f6' }],
    [{ level: 1.5 }, { text: '1.5', color: '#334155' }],
    [{ level: 'cao' }, { text: 'cao', color: '#334155' }],
    [{ atp: 621 }, { text: 'Trầm trọng (L2)', color: '#ef4444' }],
    [{ atp: 620 }, { text: 'Nhẹ (L1)', color: '#3b82f6' }],
    [{ atp: 190 }, { text: 'Nhẹ', color: '#3b82f6' }],
    [{ level: '', atp: 603 }, { text: 'Trầm trọng (L2)', color: '#ef4444' }],
    [{}, null],
  ])('%j', (e, out) => expect(getApiSeverity(e)).toEqual(out))
})

describe('normalizeAlarmEvent', () => {
  it('gộp tọa độ/tốc độ, tên xe theo vehicleMap, tên vi phạm', () => {
    const ev = normalizeAlarmEvent(
      { devIdno: 'D1', atp: 621, stm: 1700000000, lat: 21000000, lng: 105000000, sp: 600 },
      { D1: '29A-123' },
    )
    expect(ev).toMatchObject({
      vehicleName: '29A-123',
      armType: '621',
      did: 'D1',
      vehiIdno: '',
      lat: 21,
      lng: 105,
      sp: 60,
      stm: 1700000000,
      displayName: 'Nghe điện thoại',
      typeName: 'Nghe điện thoại',
    })
    expect(ev.level).toBeUndefined()
  })
  it('lấy vị trí từ chuỗi position, mặc định N/A', () => {
    const ev = normalizeAlarmEvent({ position: '21.1,105.2', alarmLevel: 2 }, {})
    expect(ev).toMatchObject({ vehicleName: 'N/A', lat: 21.1, lng: 105.2, level: 2, armType: '', did: '' })
  })
})

describe('dedupeAlarmRows', () => {
  it('bỏ dòng trùng dev|time|code|guid', () => {
    const a = { devIdno: 'D', stm: 1, atp: 620 }
    expect(dedupeAlarmRows([a, { ...a }])).toHaveLength(1)
    expect(dedupeAlarmRows([{ ...a, guid: 'x' }, { ...a, guid: 'y' }])).toHaveLength(2)
  })
})

describe('needsEvidenceSupplement', () => {
  it.each([
    [[], true],
    [[{ atp: 620 }, { atp: 'x' }], false],
    [[{ atp: 620 }, {}, {}], true],
    [[{ atp: 650 }], true],
  ])('%j -> %s', (rows, out) => expect(needsEvidenceSupplement(rows)).toBe(out))
})

describe('alarmTypeMatchesFilter', () => {
  it.each([
    ['621', '620', true],
    ['620', 'ALL', true],
    ['620', '', true],
    ['', '620', false],
    ['636', '636', true],
    ['190', '190', true],
    ['625', '620', false],
  ])('(%s, %s) -> %s', (a, f, out) => expect(alarmTypeMatchesFilter(a, f)).toBe(out))
})

describe('getFilteredEvents', () => {
  const events = [
    { vehicleName: '29A-111', atp: 621, did: 'D1', vehiIdno: '' },
    { vehicleName: '30B-222', atp: 622, did: 'D2', vehiIdno: '' },
  ]
  it('lọc theo loại và từ khóa (đã lowercase/trim)', () => {
    expect(getFilteredEvents(events, 'ALL', '')).toHaveLength(2)
    expect(getFilteredEvents(events, '620', '')).toEqual([events[0]])
    expect(getFilteredEvents(events, 'ALL', '30b')).toEqual([events[1]])
    expect(getFilteredEvents(events, 'ALL', 'hút thuốc')).toEqual([events[1]])
    expect(getFilteredEvents(events, 'ALL', 'd1')).toEqual([events[0]])
  })
})

describe('exportCSV', () => {
  it('header + một dòng mỗi sự kiện (không escape dấu ")', () => {
    const stm = 1700000000
    const csv = exportCSV([
      { stm, vehicleName: '29A', atp: 620, level: 3, lat: 21.123456, lng: 105.5, sp: 60 },
      { stm: 0, vehicleName: 'X"Y', atp: 190 },
    ])
    expect(csv).toBe(
      'Thời gian,Xe,Mã lỗi,Loại vi phạm,Mức độ,Tọa độ Lat,Tọa độ Lng,Tốc độ (km/h)\n' +
        `"${new Date(stm * 1000).toLocaleString('vi-VN')}","29A","620","Nghe điện thoại","Trầm trọng","21.12346","105.50000","60.0"\n` +
        '"","X"Y","190","Ngáp","Nhẹ","","",""\n',
    )
  })
})
