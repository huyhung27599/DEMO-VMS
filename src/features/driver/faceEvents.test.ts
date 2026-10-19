import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    BASE_URL: 'http://api.test/',
    queryUserVehicle: vi.fn(),
    queryIdentifyAlarm: vi.fn(),
    performanceReportPhotoListSafe: vi.fn(),
    findVehicleInfoByDeviceJn: vi.fn(),
    faceHealth: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import sample from './__fixtures__/ai_events_raw_data_sample.json'
import rawOutput from './__fixtures__/ai_events_raw_output_actual.json'
import {
  buildVehicleMap,
  checkFaceServiceHealth,
  enrichIdentifyRowPlate,
  enrichMissingFaceImagesFromPeers,
  faceState,
  fetchIdentifyAlarmsMerged,
  findAllDevicesForDriver,
  loadDriverMapping,
  resetFaceState,
  resolveDeviceForDriver,
} from './faceEvents'
import { pickEvidenceRows } from './lib'

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>
const A = api as never

beforeEach(() => {
  resetFaceState()
  localStorage.clear()
  for (const k of [
    'queryUserVehicle',
    'queryIdentifyAlarm',
    'performanceReportPhotoListSafe',
    'findVehicleInfoByDeviceJn',
    'faceHealth',
  ] as const) {
    m[k].mockReset()
  }
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fixtures', () => {
  it('ai_events_raw_output_actual.json là phản hồi performanceReport/evidence (infos + fileTime ms), không phải output của fetchIdentifyAlarmsMerged', () => {
    expect(Object.keys(rawOutput)).toEqual(['result', 'pagination', 'infos'])
    expect(pickEvidenceRows(rawOutput)).toHaveLength(2)
    expect('events' in rawOutput).toBe(false)
  })
})

describe('loadDriverMapping', () => {
  it('GET `${BASE_URL}driver/mapping` bằng fetch trực tiếp và lưu mapping', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ '8899': 'A' }) })
    vi.stubGlobal('fetch', fetchMock)
    await loadDriverMapping()
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/driver/mapping', { method: 'GET' })
    expect(faceState.driverMapping).toEqual({ '8899': 'A' })
    await loadDriverMapping() // đã có mapping thì không gọi lại
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(faceState.isLoadingDriverMapping).toBe(false)
  })
  it('res.ok false hoặc lỗi mạng: giữ mapping rỗng, cờ loading được reset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await loadDriverMapping()
    expect(faceState.driverMapping).toEqual({})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    await loadDriverMapping()
    expect(faceState.driverMapping).toEqual({})
    expect(console.warn).toHaveBeenCalledWith('[driver.js] loadDriverMapping failed:', 'boom')
    expect(faceState.isLoadingDriverMapping).toBe(false)
  })
  it('đang load thì bỏ qua lần gọi thứ hai', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    faceState.isLoadingDriverMapping = true
    await loadDriverMapping()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('buildVehicleMap', () => {
  const res = {
    result: 0,
    vehicles: [
      { nm: 'P1', dl: ['D1'] },
      { vehiIdno: 'P2', devIdno: 'D2' },
      { id: 'D3' },
      { nm: 'noDev' },
    ],
  }
  it('ghi vehicles_cache nguyên phản hồi (JSON.stringify(res)) và dựng map devId → nm || vehiIdno || devId', async () => {
    m.queryUserVehicle.mockResolvedValue(res)
    await buildVehicleMap()
    expect(localStorage.getItem('vehicles_cache')).toBe(JSON.stringify(res))
    expect(faceState.vehicleMap).toEqual({ D1: 'P1', D2: 'P2', D3: 'D3' })
  })
  it('đọc cache trước, API lỗi thì vẫn giữ dữ liệu cache và không ghi đè', async () => {
    localStorage.setItem('vehicles_cache', JSON.stringify({ vehicles: [{ nm: 'C', dl: 'DX' }] }))
    m.queryUserVehicle.mockRejectedValue(new Error('x'))
    await buildVehicleMap()
    expect(faceState.vehicleMap).toEqual({ DX: 'C' })
    expect(localStorage.getItem('vehicles_cache')).toBe(JSON.stringify({ vehicles: [{ nm: 'C', dl: 'DX' }] }))
  })
  it('cache hỏng và phản hồi không có vehicles: không ném, không ghi cache', async () => {
    localStorage.setItem('vehicles_cache', '{bad')
    m.queryUserVehicle.mockResolvedValue({ result: 5 })
    await buildVehicleMap()
    expect(faceState.vehicleMap).toEqual({})
    expect(localStorage.getItem('vehicles_cache')).toBe('{bad')
  })
})

describe('resolveDeviceForDriver', () => {
  it('trả từ cache driverDeviceMap', async () => {
    faceState.driverDeviceMap['J1'] = 'D9'
    expect(await resolveDeviceForDriver({ jn: 'J1' })).toBe('D9')
    expect(m.findVehicleInfoByDeviceJn).not.toHaveBeenCalled()
  })
  it('tra theo jn (type 2), lấy infos[0], lưu cache', async () => {
    m.findVehicleInfoByDeviceJn.mockResolvedValue({ infos: [{ devIdno: 'D5' }] })
    expect(await resolveDeviceForDriver({ jn: 'J2' })).toBe('D5')
    expect(m.findVehicleInfoByDeviceJn).toHaveBeenCalledWith(2, 'J2')
    expect(faceState.driverDeviceMap['J2']).toBe('D5')
  })
  it('fallback vehicles/data; không có kết quả thì dùng vehicleMap nếu có đúng 1 xe, ngược lại ""', async () => {
    m.findVehicleInfoByDeviceJn.mockResolvedValue({ data: [{ id: 'D6' }] })
    expect(await resolveDeviceForDriver({ jn: 'J3' })).toBe('D6')
    m.findVehicleInfoByDeviceJn.mockResolvedValue(null)
    faceState.vehicleMap = { ONLY: 'P' }
    expect(await resolveDeviceForDriver({ jn: 'J4' })).toBe('ONLY')
    faceState.vehicleMap = { A: 'a', B: 'b' }
    expect(await resolveDeviceForDriver({ jn: 'J4' })).toBe('')
    expect(await resolveDeviceForDriver({})).toBe('')
  })
})

describe('findAllDevicesForDriver', () => {
  const vehicles = [
    { di: ' 7 ', dl: ['D1'] },
    { jobNum: 'ABC', dl: ['D2'] },
    { dn: 'Nguyễn Văn Trường', dl: ['D3'] },
    { dn: 'Khác', dl: ['D4'] },
    { di: '7', dl: ['D1'] },
  ]
  it('khớp theo id, jn, tên (includes, không phân biệt hoa thường) và loại trùng', async () => {
    m.queryUserVehicle.mockResolvedValue({ vehicles })
    expect(await findAllDevicesForDriver({ id: 7, jn: 'abc', dn: 'văn trường' })).toEqual(['D1', 'D2', 'D3'])
  })
  it('thiếu vehicles / null / ném lỗi → []', async () => {
    m.queryUserVehicle.mockResolvedValue(null)
    expect(await findAllDevicesForDriver({ id: 1 })).toEqual([])
    m.queryUserVehicle.mockResolvedValue({ result: 5 })
    expect(await findAllDevicesForDriver({ id: 1 })).toEqual([])
    m.queryUserVehicle.mockRejectedValue(new Error('x'))
    expect(await findAllDevicesForDriver({ id: 1 })).toEqual([])
    expect(console.error).toHaveBeenCalled()
  })
  it('tài xế không có id/jn/dn → không khớp xe nào', async () => {
    m.queryUserVehicle.mockResolvedValue({ vehicles })
    expect(await findAllDevicesForDriver({})).toEqual([])
  })
})

describe('enrichMissingFaceImagesFromPeers', () => {
  it('gán ảnh từ bản ghi cùng thiết bị trong cùng cửa sổ 5 phút', () => {
    const withImg = { devIdno: 'D', vehiIdno: 'P', st: 1000, captureFaceUrl: 'http://i/a.jpg', imageUrl: 'http://i/a.jpg' }
    const noImg = { devIdno: 'D', vehiIdno: 'P', st: 1100 }
    const far = { devIdno: 'D', vehiIdno: 'P', st: 9000 }
    const out = enrichMissingFaceImagesFromPeers([withImg, noImg, far])
    expect(out[0]).toBe(withImg)
    expect(out[1]).toMatchObject({ captureFaceUrl: 'http://i/a.jpg', armUrl: 'http://i/a.jpg', imageUrl: 'http://i/a.jpg' })
    expect(out[2]).toBe(far)
  })
  it('thiếu field / rỗng: trả nguyên', () => {
    expect(enrichMissingFaceImagesFromPeers([])).toEqual([])
    const e = {}
    expect(enrichMissingFaceImagesFromPeers([e])[0]).toBe(e)
  })
})

describe('enrichIdentifyRowPlate', () => {
  it('gán vehiIdno từ vehicleMap khi chưa có vehiIdno/vi', () => {
    faceState.vehicleMap = { D1: 'P1' }
    const a: Record<string, unknown> = { devIdno: 'D1' }
    enrichIdentifyRowPlate(a)
    expect(a.vehiIdno).toBe('P1')
    const b: Record<string, unknown> = { devIdno: 'D1', vi: 'X' }
    enrichIdentifyRowPlate(b)
    expect(b.vehiIdno).toBeUndefined()
  })
  it('thiếu thiết bị / không có trong map: không đổi', () => {
    const c: Record<string, unknown> = {}
    enrichIdentifyRowPlate(c)
    enrichIdentifyRowPlate({ devIdno: 'ZZ' })
    expect(c).toEqual({})
  })
})

describe('fetchIdentifyAlarmsMerged', () => {
  const vehicles = [{ dl: ['30009'], nm: '29H-123.45', vehiIdno: '29H-123.45' }]
  // Fixture raw_output_actual KHÔNG phải output của luồng này (xem test đầu); kỳ vọng suy từ code.
  it('luồng đầy đủ trên fixture ai_events_raw_data_sample.json', async () => {
    m.queryIdentifyAlarm.mockResolvedValue(sample.identify_alarm_sample)
    m.queryUserVehicle.mockResolvedValue({ result: 0, vehicles })
    m.performanceReportPhotoListSafe.mockImplementation(async (_b, _e, alarmType, mediaType) => {
      if (alarmType === 636 && mediaType === 1) return { result: 0, photos: [] }
      return sample.evidence_media_sample
    })

    const out = await fetchIdentifyAlarmsMerged(A, '2026-04-02 00:00:00', '2026-04-02 23:59:59')

    expect(m.queryIdentifyAlarm).toHaveBeenCalledTimes(1)
    expect(m.queryIdentifyAlarm).toHaveBeenCalledWith('2026-04-02 00:00:00', '2026-04-02 23:59:59', '', 1, 200)
    expect(m.performanceReportPhotoListSafe).toHaveBeenCalledWith(
      '2026-04-02 00:00:00', '2026-04-02 23:59:59', 636, 1, '29H-123.45', '30009')
    expect(m.performanceReportPhotoListSafe).toHaveBeenCalledWith(
      '2026-04-02 00:00:00', '2026-04-02 23:59:59', 636, 0, '29H-123.45', '30009')
    expect(m.performanceReportPhotoListSafe).toHaveBeenCalledWith(
      '2026-04-02 00:00:00', '2026-04-02 23:59:59', 643, 1, '29H-123.45', '30009')
    expect(m.performanceReportPhotoListSafe).toHaveBeenCalledTimes(3)

    expect(out.warnings).toEqual([])
    expect(out.identifyGlobalMsg).toBe('')
    expect(out.stats).toEqual({ fromIdentify: 1, fromEvidence: 2, merged: 3 })
    expect(out.events).toHaveLength(3)
    // sắp xếp giảm dần theo thời gian: 2 bản evidence (2026) trước bản identify (2024)
    expect(out.events.map((e) => e._source)).toEqual(['safetyEvidence', 'safetyEvidence', undefined])
    expect(out.events.map((e) => e.ty).sort()).toEqual(['636', '643', '643'])
    const ident = out.events[2]
    expect(ident).toMatchObject({ guid: 'f1e2d3c4-b5a6-9876-5432-10abcdef1234', devIdno: '30009', vehiIdno: '29H-123.45' })
    expect(localStorage.getItem('vehicles_cache')).toBe(JSON.stringify({ result: 0, vehicles }))
  })

  it('global lỗi: ghi warning + identifyGlobalMsg, rồi quét từng thiết bị theo lô, gán devIdno, loại trùng', async () => {
    m.queryIdentifyAlarm.mockImplementation(async (_b, _e, dev) => {
      if (dev === '') return { result: 5, msg: 'hết phiên' }
      if (dev === '30009') return { result: 0, alarms: [{ guid: 'g1', st: 1712028000, ty: '643' }] }
      return { result: 0, alarms: [] }
    })
    m.queryUserVehicle.mockResolvedValue({ vehicles: [...vehicles, { dl: ['30009'] }, { dl: ['30010'] }] })
    m.performanceReportPhotoListSafe.mockResolvedValue({ result: 7, msg: 'no data' })

    const out = await fetchIdentifyAlarmsMerged(A, 'b', 'e')
    expect(out.identifyGlobalMsg).toBe('hết phiên')
    expect(out.warnings).toEqual(['queryIdentifyAlarm (toàn hệ thống): hết phiên'])
    expect(m.queryIdentifyAlarm).toHaveBeenCalledWith('b', 'e', '30009', 1, 80)
    expect(m.queryIdentifyAlarm).toHaveBeenCalledWith('b', 'e', '30010', 1, 80)
    expect(out.stats).toEqual({ fromIdentify: 1, fromEvidence: 0, merged: 1 })
    expect(out.events[0]).toMatchObject({ guid: 'g1', devIdno: '30009' })
  })

  it('evidence lỗi: result khác 7 có warning, result 7 bị bỏ qua, exception được bắt; warnings loại trùng', async () => {
    m.queryIdentifyAlarm.mockResolvedValue({ result: 0, alarms: [] })
    m.queryUserVehicle.mockResolvedValue({ vehicles })
    m.performanceReportPhotoListSafe.mockImplementation(async (_b, _e, alarmType) => {
      if (alarmType === 636) return { result: 3, msg: 'lỗi X' }
      throw new Error('mạng')
    })
    const out = await fetchIdentifyAlarmsMerged(A, 'b', 'e')
    expect(out.warnings).toEqual(['Evidence 636 (29H-123.45): lỗi X', 'Evidence 643: mạng'])
    expect(out.events).toEqual([])
  })

  it('không có phản hồi xe: không quét evidence, trả rỗng', async () => {
    m.queryIdentifyAlarm.mockResolvedValue(null)
    m.queryUserVehicle.mockResolvedValue(null)
    const out = await fetchIdentifyAlarmsMerged(A, 'b', 'e')
    expect(out).toEqual({
      events: [],
      warnings: [],
      identifyGlobalMsg: '',
      stats: { fromIdentify: 0, fromEvidence: 0, merged: 0 },
    })
    expect(m.performanceReportPhotoListSafe).not.toHaveBeenCalled()
  })
})

describe('checkFaceServiceHealth', () => {
  const hint =
    'Gợi ý: trong Face_recognite_module/face_recognition_core chạy uvicorn face_api_service:app --host 0.0.0.0 --port 5001'
  it('status ok', async () => {
    m.faceHealth.mockResolvedValue({ status: 'ok', known_drivers: 12 })
    expect(await checkFaceServiceHealth()).toEqual({
      ok: true,
      statusText: 'AI Service đang chạy',
      dbText: 'Database: 12 tài xế',
    })
    expect(faceState.faceServiceOk).toBe(true)
  })
  it('status error (có / không detail)', async () => {
    faceState.faceServiceOk = true
    m.faceHealth.mockResolvedValue({ status: 'error', detail: 'numpy' })
    const r = await checkFaceServiceHealth()
    expect(r).toEqual({
      ok: false,
      statusText: 'AI Service lỗi khi tải model',
      dbText: 'numpy. Kiểm tra NumPy 1.x + insightface (xem requirements.txt).',
    })
    expect(faceState.faceServiceOk).toBe(false)
    m.faceHealth.mockResolvedValue({ status: 'error' })
    expect((await checkFaceServiceHealth()).dbText).toBe(
      'Không load được recognizer. Kiểm tra NumPy 1.x + insightface (xem requirements.txt).',
    )
  })
  it('result 5 (số hoặc chuỗi)', async () => {
    m.faceHealth.mockResolvedValue({ result: '5', msg: 'm' })
    expect(await checkFaceServiceHealth()).toEqual({ ok: false, statusText: 'Phiên đăng nhập hết hạn', dbText: 'm' })
    m.faceHealth.mockResolvedValue({ result: 5 })
    expect((await checkFaceServiceHealth()).dbText).toBe('Đăng nhập lại rồi mở lại trang tài xế.')
  })
  it('result 99 (có / không error)', async () => {
    m.faceHealth.mockResolvedValue({ result: 99, msg: 'down', error: 'ECONNREFUSED' })
    expect(await checkFaceServiceHealth()).toEqual({
      ok: false,
      statusText: 'Không gọi được AI trên cổng 5001',
      dbText: `down (ECONNREFUSED). ${hint}`,
    })
    m.faceHealth.mockResolvedValue({ result: '99' })
    expect((await checkFaceServiceHealth()).dbText).toBe(`Face AI Service unavailable. ${hint}`)
  })
  it('phản hồi lạ / null / ném lỗi → "AI Service chưa khởi động"', async () => {
    m.faceHealth.mockResolvedValue({ msg: 'oops' })
    expect(await checkFaceServiceHealth()).toEqual({
      ok: false,
      statusText: 'AI Service chưa khởi động',
      dbText: `oops. ${hint}`,
    })
    m.faceHealth.mockResolvedValue(null)
    expect((await checkFaceServiceHealth()).dbText).toBe(`Phản hồi health không hợp lệ. ${hint}`)
    m.faceHealth.mockRejectedValue(new Error(''))
    expect((await checkFaceServiceHealth()).dbText).toBe(hint)
  })
})
