import { afterEach, describe, expect, it } from 'vitest'
import { BASE_URL } from '../../shared/api/client'
import sample from './__fixtures__/ai_events_raw_data_sample.json'
import * as L from './lib'

afterEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('formatDateForInput / formatDateMsToDateInput / parseDateInputToUtcMs', () => {
  it('formatDateForInput cho giờ địa phương dạng yyyy-MM-ddTHH:mm', () => {
    expect(L.formatDateForInput(new Date(2026, 3, 2, 9, 5))).toBe('2026-04-02T09:05')
  })
  it('formatDateMsToDateInput: ca thường và null/rỗng/NaN', () => {
    expect(L.formatDateMsToDateInput(new Date(2026, 3, 2, 0, 0).getTime())).toBe('2026-04-02')
    expect(L.formatDateMsToDateInput(null)).toBe('')
    expect(L.formatDateMsToDateInput('')).toBe('')
    expect(L.formatDateMsToDateInput('abc')).toBe('')
  })
  it('parseDateInputToUtcMs: nửa đêm địa phương; sai định dạng → null', () => {
    expect(L.parseDateInputToUtcMs('2026-04-02')).toBe(new Date(2026, 3, 2).getTime())
    expect(L.parseDateInputToUtcMs('2026-04')).toBeNull()
    expect(L.parseDateInputToUtcMs('a-b-c')).toBeNull()
    expect(L.parseDateInputToUtcMs(null)).toBeNull()
  })
})

describe('extractDevIdFromVehicle / extractDevIdFromAny', () => {
  it('vehicle: dl string, dl mảng, fallback, null', () => {
    expect(L.extractDevIdFromVehicle({ dl: 'D1' })).toBe('D1')
    expect(L.extractDevIdFromVehicle({ dl: ['D2'] })).toBe('D2')
    expect(L.extractDevIdFromVehicle({ dl: [{ id: 'D3' }] })).toBe('D3')
    expect(L.extractDevIdFromVehicle({ dl: [{ devIdno: 'D4' }] })).toBe('D4')
    expect(L.extractDevIdFromVehicle({ dl: [], devIdno: 'D5' })).toBe('D5')
    expect(L.extractDevIdFromVehicle({ id: 'D6' })).toBe('D6')
    expect(L.extractDevIdFromVehicle({})).toBe('')
    expect(L.extractDevIdFromVehicle(null)).toBe('')
  })
  it('any: thứ tự devIdno > DevIDNO > id > did > dl; null', () => {
    expect(L.extractDevIdFromAny({ devIdno: 'a', id: 'b' })).toBe('a')
    expect(L.extractDevIdFromAny({ DevIDNO: 'a' })).toBe('a')
    expect(L.extractDevIdFromAny({ id: 'b' })).toBe('b')
    expect(L.extractDevIdFromAny({ did: 'c' })).toBe('c')
    expect(L.extractDevIdFromAny({ dl: 'd' })).toBe('d')
    expect(L.extractDevIdFromAny({ dl: ['e'] })).toBe('e')
    expect(L.extractDevIdFromAny({ dl: [{ devIdno: 'f' }] })).toBe('f')
    expect(L.extractDevIdFromAny({})).toBe('')
    expect(L.extractDevIdFromAny(null)).toBe('')
  })
})

describe('normalizeUnixSeconds', () => {
  it('giây giữ nguyên, ms chia 1000', () => {
    expect(L.normalizeUnixSeconds(1712028000)).toBe(1712028000)
    expect(L.normalizeUnixSeconds(1712028000123)).toBe(1712028000)
    expect(L.normalizeUnixSeconds('1712028000')).toBe(1712028000)
  })
  it('null/rỗng/NaN/ngoài khoảng → null', () => {
    expect(L.normalizeUnixSeconds(null)).toBeNull()
    expect(L.normalizeUnixSeconds('')).toBeNull()
    expect(L.normalizeUnixSeconds('x')).toBeNull()
    expect(L.normalizeUnixSeconds(5)).toBeNull()
    expect(L.normalizeUnixSeconds(5e11)).toBeNull()
  })
})

describe('toDisplayableImageUrl', () => {
  it('rỗng / không phải chuỗi → ""', () => {
    expect(L.toDisplayableImageUrl(null)).toBe('')
    expect(L.toDisplayableImageUrl('   ')).toBe('')
  })
  it('data:, blob:, face/capture, driver/photo giữ nguyên dù có token', () => {
    sessionStorage.setItem('dashcam_auth_token', 'T')
    expect(L.toDisplayableImageUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx')
    expect(L.toDisplayableImageUrl('blob:abc')).toBe('blob:abc')
    expect(L.toDisplayableImageUrl('http://x/api/face/capture/a.jpg')).toBe('http://x/api/face/capture/a.jpg')
    expect(L.toDisplayableImageUrl('http://x/api/driver/photo/1/f.jpg')).toBe('http://x/api/driver/photo/1/f.jpg')
  })
  it('không có token → trả nguyên URL (đã trim)', () => {
    expect(L.toDisplayableImageUrl(' https://fleetscontrol.com/a.jpg ')).toBe('https://fleetscontrol.com/a.jpg')
  })
  it('có token: URL khác origin API → fleet-media-proxy với jsession (đọc thô sessionStorage trước localStorage)', () => {
    localStorage.setItem('dashcam_auth_token', 'LOCAL')
    sessionStorage.setItem('dashcam_auth_token', 'SESS')
    const u = 'https://fleetscontrol.com/a b.jpg'
    expect(L.toDisplayableImageUrl(u)).toBe(`${BASE_URL}fleet-media-proxy?u=${encodeURIComponent(u)}&jsession=SESS`)
    sessionStorage.clear()
    expect(L.toDisplayableImageUrl(u)).toContain('jsession=LOCAL')
  })
  it('có token: URL cùng origin API giữ nguyên; path tương đối chứa fleetscontrol.com đi qua proxy; khác → nguyên', () => {
    sessionStorage.setItem('dashcam_auth_token', 'T')
    const same = `${new URL(BASE_URL, window.location.href).origin}/x.jpg`
    expect(L.toDisplayableImageUrl(same)).toBe(same)
    expect(L.toDisplayableImageUrl('fleetscontrol.com/x.jpg')).toContain('fleet-media-proxy?u=')
    expect(L.toDisplayableImageUrl('other/x.jpg')).toBe('other/x.jpg')
  })
})

describe('escapeHtml', () => {
  it('thoát & < > " ; null/undefined → ""; số → chuỗi', () => {
    expect(L.escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
    expect(L.escapeHtml(null)).toBe('')
    expect(L.escapeHtml(undefined)).toBe('')
    expect(L.escapeHtml(5)).toBe('5')
  })
})

describe('toAbsoluteFleetUrl / firstPathFromField / nestedMediaUrl', () => {
  it('toAbsoluteFleetUrl', () => {
    expect(L.toAbsoluteFleetUrl('http://a/b.jpg')).toBe('http://a/b.jpg')
    expect(L.toAbsoluteFleetUrl('/p/a.jpg')).toBe('https://fleetscontrol.com/p/a.jpg')
    expect(L.toAbsoluteFleetUrl('p/a.jpg')).toBe('https://fleetscontrol.com/p/a.jpg')
    expect(L.toAbsoluteFleetUrl('  ')).toBe('')
    expect(L.toAbsoluteFleetUrl(null)).toBe('')
  })
  it('firstPathFromField lấy phần tử không rỗng đầu tiên', () => {
    expect(L.firstPathFromField(' ; /a.jpg;/b.jpg')).toBe('https://fleetscontrol.com/a.jpg')
    expect(L.firstPathFromField(';;')).toBe('')
    expect(L.firstPathFromField(undefined)).toBe('')
    expect(L.firstPathFromField(5)).toBe('')
  })
  it('nestedMediaUrl: chuỗi, object theo thứ tự url>URL>path..., null', () => {
    expect(L.nestedMediaUrl('/a.jpg')).toBe('https://fleetscontrol.com/a.jpg')
    expect(L.nestedMediaUrl({ path: '/p.jpg', url: '/u.jpg' })).toBe('https://fleetscontrol.com/u.jpg')
    expect(L.nestedMediaUrl({ mediaUrl: 'm.jpg' })).toBe('https://fleetscontrol.com/m.jpg')
    expect(L.nestedMediaUrl({ url: 5 })).toBe('')
    expect(L.nestedMediaUrl({})).toBe('')
    expect(L.nestedMediaUrl(null)).toBe('')
    expect(L.nestedMediaUrl(3)).toBe('')
  })
})

describe('shallowScanImageField', () => {
  it('tìm field chuỗi chứa đuôi ảnh và có dấu / hoặc http; bỏ qua key bắt đầu _', () => {
    expect(L.shallowScanImageField({ _x: '/a.jpg', foo: 'dir/a.png' })).toBe('https://fleetscontrol.com/dir/a.png')
    expect(L.shallowScanImageField({ foo: 'abc.jpg' })).toBe('')
    expect(L.shallowScanImageField({ foo: 'x'.repeat(3000) + '.jpg' })).toBe('')
  })
  it('null / không phải object → ""', () => {
    expect(L.shallowScanImageField(null)).toBe('')
    expect(L.shallowScanImageField('s')).toBe('')
  })
})

describe('apiResultOk / pickIdentifyAlarmRows / pickEvidenceRows', () => {
  it('apiResultOk', () => {
    expect(L.apiResultOk({ result: 0 })).toBe(true)
    expect(L.apiResultOk({ result: '0' })).toBe(true)
    expect(L.apiResultOk({ result: 5 })).toBe(false)
    expect(L.apiResultOk(null)).toBe(false)
  })
  it('pickIdentifyAlarmRows trên fixture identify_alarm_sample; alarms trước infos; thiếu → []', () => {
    expect(L.pickIdentifyAlarmRows(sample.identify_alarm_sample)).toHaveLength(1)
    expect(L.pickIdentifyAlarmRows({ alarms: [1], infos: [2] })).toEqual([1])
    expect(L.pickIdentifyAlarmRows({ infos: [2] })).toEqual([2])
    expect(L.pickIdentifyAlarmRows({ alarms: 'x' })).toEqual([])
    expect(L.pickIdentifyAlarmRows({})).toEqual([])
  })
  it('pickEvidenceRows trên fixture evidence_media_sample; result lỗi/null → []', () => {
    expect(L.pickEvidenceRows(sample.evidence_media_sample)).toHaveLength(1)
    expect(L.pickEvidenceRows({ result: 0, infos: [1] })).toEqual([1])
    expect(L.pickEvidenceRows({ result: 7, photos: [1] })).toEqual([])
    expect(L.pickEvidenceRows(null)).toEqual([])
    expect(L.pickEvidenceRows({ result: 0 })).toEqual([])
  })
})

describe('parseEvidenceTimeToSt / evidenceItemToFaceEvent', () => {
  it('st giây, st ms, chuỗi thời gian, thiếu → 0', () => {
    expect(L.parseEvidenceTimeToSt({ st: 1712028000 })).toBe(1712028000)
    expect(L.parseEvidenceTimeToSt({ stm: 1712028000999 })).toBe(1712028000)
    expect(L.parseEvidenceTimeToSt({ time: '2026-04-02 10:30:00' })).toBe(
      Math.floor(new Date('2026-04-02T10:30:00').getTime() / 1000),
    )
    expect(L.parseEvidenceTimeToSt({ st: 5 })).toBe(0)
    expect(L.parseEvidenceTimeToSt({})).toBe(0)
    expect(L.parseEvidenceTimeToSt({ time: 'zzz' })).toBe(0)
  })
  it('evidenceItemToFaceEvent trên fixture photo', () => {
    const e = L.evidenceItemToFaceEvent(sample.evidence_media_sample.photos[0], 643, 'P1', 'D1')
    expect(e).toMatchObject({
      _source: 'safetyEvidence',
      guid: '',
      vehiIdno: 'P1',
      devIdno: 'D1',
      ty: '643',
      dn: '',
      armUrl: 'http://localhost:4000/api/driver/photo/8899/face_1.jpg',
      captureFaceUrl: 'http://localhost:4000/api/driver/photo/8899/face_1.jpg',
      imageUrl: 'http://localhost:4000/api/driver/photo/8899/face_1.jpg',
    })
    expect(e.st).toBeGreaterThan(0)
    expect(e.simil).toBeUndefined()
  })
  it('evidenceItemToFaceEvent: item rỗng, thiếu tham số', () => {
    expect(L.evidenceItemToFaceEvent({}, 636, undefined, undefined)).toMatchObject({
      vehiIdno: '',
      devIdno: '',
      st: 0,
      ty: '636',
      armUrl: '',
    })
  })
})

describe('dedupeIdentifyRows', () => {
  it('loại bản trùng theo guid|dev|ty|t, giữ bản đầu', () => {
    const a = { guid: 'g', devIdno: 'd', ty: '1', st: 5, k: 1 }
    const b = { guid: 'g', devId: 'd', armType: '1', stm: 5, k: 2 }
    const c = { guid: 'g2', devIdno: 'd', ty: '1', st: 5 }
    expect(L.dedupeIdentifyRows([a, b, c])).toEqual([a, c])
  })
  it('mảng rỗng; bản ghi thiếu field', () => {
    expect(L.dedupeIdentifyRows([])).toEqual([])
    expect(L.dedupeIdentifyRows([{}, {}])).toHaveLength(1)
  })
})

describe('extractSimilarityPct', () => {
  it('0..1 thành %, 1..100 giữ, ngoài khoảng thì kẹp 0..100', () => {
    expect(L.extractSimilarityPct({ simil: 0.876 })).toBe(88)
    expect(L.extractSimilarityPct({ similarity: '85.4' })).toBe(85)
    expect(L.extractSimilarityPct({ score: 250 })).toBe(100)
    expect(L.extractSimilarityPct({ faceScore: -3 })).toBe(0)
    expect(L.extractSimilarityPct({ simil: 0 })).toBe(0)
  })
  it('thiếu/null/rỗng/NaN → null', () => {
    expect(L.extractSimilarityPct({})).toBeNull()
    expect(L.extractSimilarityPct({ simil: null })).toBeNull()
    expect(L.extractSimilarityPct({ simil: '' })).toBeNull()
    expect(L.extractSimilarityPct({ simil: 'x' })).toBeNull()
  })
})

describe('pickRegisteredFaceUrl / pickCaptureFaceUrl', () => {
  it('registered: key phẳng, nested, thiếu', () => {
    expect(L.pickRegisteredFaceUrl({ regFaceUrl: '/r.jpg' })).toBe('https://fleetscontrol.com/r.jpg')
    expect(L.pickRegisteredFaceUrl({ compareLeft: { url: '/l.jpg' } })).toBe('https://fleetscontrol.com/l.jpg')
    expect(L.pickRegisteredFaceUrl({})).toBe('')
  })
  it('capture: ưu tiên captureFaceUrl, armUrl, nested, quét nông, thiếu', () => {
    expect(L.pickCaptureFaceUrl({ armUrl: 'http://a/1.jpg', captureFaceUrl: 'http://a/2.jpg' })).toBe('http://a/2.jpg')
    expect(L.pickCaptureFaceUrl(sample.safety_alarm_sample.alarms[0])).toBe(
      'http://evidence-server.com/photo/20260402/30009_622_1.jpg',
    )
    expect(L.pickCaptureFaceUrl({ snapObj: { path: 'x/s.jpg' } })).toBe('https://fleetscontrol.com/x/s.jpg')
    expect(L.pickCaptureFaceUrl({ weird: 'dir/z.png' })).toBe('https://fleetscontrol.com/dir/z.png')
    expect(L.pickCaptureFaceUrl(sample.safety_alarm_sample.alarms[1])).toBe('')
  })
})

describe('extractJobNumFromEvent / localRegisteredPhotoFromMapping', () => {
  it('job num từ jn, driverJn, jobNum, licenseNum, hoặc ngoặc cuối tên', () => {
    expect(L.extractJobNumFromEvent({ jn: ' 12 ' })).toBe('12')
    expect(L.extractJobNumFromEvent({ driverJn: 'a' })).toBe('a')
    expect(L.extractJobNumFromEvent({ jobNum: 5 })).toBe('5')
    expect(L.extractJobNumFromEvent({ licenseNum: 'L' })).toBe('L')
    expect(L.extractJobNumFromEvent(sample.identify_alarm_sample.alarms[0])).toBe('8899')
    expect(L.extractJobNumFromEvent({ jn: '  ' })).toBe('')
    expect(L.extractJobNumFromEvent({})).toBe('')
  })
  it('localRegisteredPhotoFromMapping dùng mapping, fallback dn, trả "" khi thiếu', () => {
    const evt = { jn: '8899', dn: 'Nguyễn Văn A/B' }
    expect(L.localRegisteredPhotoFromMapping(evt, 'http://b/', { '8899': 'Trần Văn C' })).toBe(
      `http://b/driver/photo/${encodeURIComponent('8899_Trần_Văn_C')}/face_1.jpg`,
    )
    expect(L.localRegisteredPhotoFromMapping(evt, 'http://b/')).toBe(
      `http://b/driver/photo/${encodeURIComponent('8899_Nguyễn_Văn_A_B')}/face_1.jpg`,
    )
    expect(L.localRegisteredPhotoFromMapping(evt, '')).toBe('')
    expect(L.localRegisteredPhotoFromMapping({}, 'http://b/')).toBe('')
    expect(L.localRegisteredPhotoFromMapping({ jn: '1', dn: '—' }, 'http://b/')).toBe('')
    expect(L.localRegisteredPhotoFromMapping({ jn: '1' }, 'http://b/', null)).toBe('')
  })
})

describe('eventImageScore / dedupeFaceEventsMerged', () => {
  it('score: capture 2 + registered 1', () => {
    expect(L.eventImageScore({})).toBe(0)
    expect(L.eventImageScore({ armUrl: '/a.jpg' })).toBe(2)
    expect(L.eventImageScore({ armUrl: '/a.jpg', regFaceUrl: '/r.jpg' })).toBe(3)
  })
  it('gộp theo guid, bản có ảnh tốt hơn ghi đè', () => {
    const out = L.dedupeFaceEventsMerged([
      { guid: 'g', dn: 'A', x: 1 },
      { guid: 'g', captureFaceUrl: 'http://i/1.jpg', y: 2 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ guid: 'g', dn: 'A', x: 1, y: 2, captureFaceUrl: 'http://i/1.jpg' })
  })
  it('không guid: khóa theo t|dev|plate|ty|media; khác nhau thì giữ riêng; rỗng', () => {
    const out = L.dedupeFaceEventsMerged([
      { st: 1, devIdno: 'd', ty: '1' },
      { st: 1, devId: 'd', armType: '1' },
      { st: 2, devIdno: 'd', ty: '1' },
    ])
    expect(out).toHaveLength(2)
    expect(L.dedupeFaceEventsMerged([])).toEqual([])
  })
})

describe('formatIdentifyEventTime', () => {
  it('có st hợp lệ thì toLocaleString vi-VN', () => {
    expect(L.formatIdentifyEventTime({ st: 1712028000 })).toBe(new Date(1712028000 * 1000).toLocaleString('vi-VN'))
  })
  it('không có st thì chuỗi thời gian khác hoặc "--"', () => {
    expect(L.formatIdentifyEventTime({ timeStr: 'T' })).toBe('T')
    expect(L.formatIdentifyEventTime({ endtime: 'E' })).toBe('E')
    expect(L.formatIdentifyEventTime({})).toBe('--')
  })
})

describe('mapLocalFaceLogToEvent', () => {
  it('bản ghi đầy đủ', () => {
    const e = L.mapLocalFaceLogToEvent(
      {
        id: 7,
        captureFile: 'a b.jpg',
        eventTime: '2026-04-02T03:00:00.000Z',
        driverName: 'X',
        faceCount: 1,
        match: true,
        accuracy: 0.9,
        latitude: '21.5',
        longitude: 105.5,
        locationText: 'L',
        devIdno: 'D',
        vehiIdno: 'P',
        driverCode: 'C',
      },
      'http://b/',
    )
    expect(e).toMatchObject({
      _source: 'localDb',
      guid: 'local-7',
      st: Math.floor(Date.parse('2026-04-02T03:00:00.000Z') / 1000),
      ty: 'local_ai',
      dn: 'X',
      matchResult: 1,
      simil: 0.9,
      blat: 21500000,
      blng: 105500000,
      position: 'L',
      captureFaceUrl: 'http://b/face/capture/a%20b.jpg',
      imageUrl: 'http://b/face/capture/a%20b.jpg',
    })
  })
  it('thiếu field: faceCount 0, Unknown, không id/time/lat', () => {
    const none = L.mapLocalFaceLogToEvent({ devIdno: 'D', faceCount: 0 }, 'http://b/')
    expect(none).toMatchObject({ guid: 'local-0-D', st: 0, dn: 'Cabin không có khuôn mặt', matchResult: undefined })
    expect(none.blat).toBeUndefined()
    expect(none.captureFaceUrl).toBe('')
    expect(L.mapLocalFaceLogToEvent({ faceCount: 2, driverName: 'Unknown', match: false }, 'b/')).toMatchObject({
      dn: 'Người lạ (Unknown)',
      matchResult: 0,
    })
    expect(L.mapLocalFaceLogToEvent({ createdAt: '2026-04-02T03:00:00Z' }, 'b/').st).toBeGreaterThan(0)
    expect(L.mapLocalFaceLogToEvent({}, 'b/').dn).toBe('—')
  })
})

describe('identifyAlarmTypeLabel', () => {
  it('nhãn đã biết, mã lạ, rỗng/null', () => {
    expect(L.identifyAlarmTypeLabel('643')).toBe('Sự kiện nhận dạng tài xế')
    expect(L.identifyAlarmTypeLabel(620)).toBe('Nghe điện thoại')
    expect(L.identifyAlarmTypeLabel('999')).toBe('Mã cảnh báo 999')
    expect(L.identifyAlarmTypeLabel('local_ai')).toBe('Mã cảnh báo local_ai')
    expect(L.identifyAlarmTypeLabel('')).toBe('')
    expect(L.identifyAlarmTypeLabel(null)).toBe('')
  })
})

describe('parseFacePhotoUrlToSlots', () => {
  it('tách theo ; tối đa 5 ô', () => {
    expect(L.parseFacePhotoUrlToSlots(' a ; b ;;c')).toEqual(['a', 'b', 'c', null, null])
    expect(L.parseFacePhotoUrlToSlots('1;2;3;4;5;6')).toEqual(['1', '2', '3', '4', '5'])
  })
  it('rỗng/null → 5 null', () => {
    expect(L.parseFacePhotoUrlToSlots(null)).toEqual([null, null, null, null, null])
    expect(L.parseFacePhotoUrlToSlots('')).toEqual([null, null, null, null, null])
  })
})
