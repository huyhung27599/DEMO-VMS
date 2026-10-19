import { describe, expect, it } from 'vitest'
import { extractUrlFromLiveHtmlResponse, normalizeDriverInfo, pickFirst } from './lib'

const PLAYER = 'https://fleetscontrol.com/808gps/open/player/RealPlayVideo.html?jsession=abc&PlateNum=51A'

describe('extractUrlFromLiveHtmlResponse', () => {
  it.each([
    ['rỗng / null', null, ''],
    ['chuỗi chính là URL hợp lệ (trim)', `  ${PLAYER}  `, PLAYER],
    [
      'HTML chứa URL player: cả chuỗi HTML hợp lệ theo isValidExternalUrl -> trả nguyên HTML (bug gốc)',
      `<iframe src="${PLAYER}"></iframe>`,
      `<iframe src="${PLAYER}"></iframe>`,
    ],
    [
      'nhánh regex: HTML có chữ localhost (cả chuỗi bị loại) -> URL player đầu tiên',
      `<!-- localhost --><script src="https://cdn.example.com/a.js"></script><iframe src="${PLAYER}"></iframe>`,
      PLAYER,
    ],
    ['nhánh regex: HTML bắt đầu bằng "/" -> URL player', `/x <a href='${PLAYER}'>`, PLAYER],
    ['HTML chỉ có URL localhost -> rỗng', '<a href="http://localhost:4000/808gps/x">x</a>', ''],
    ['HTML không có URL', '<div>no url</div>', ''],
    ['object: res.url hợp lệ', { result: 0, url: PLAYER }, PLAYER],
    ['object: bỏ url cùng origin (bắt đầu bằng /), lấy res.playUrl', { url: '/808gps/x', playUrl: PLAYER }, PLAYER],
    [
      'object: res.html chứa iframe -> trả nguyên HTML (bug gốc)',
      { result: 0, html: `<iframe src='${PLAYER}'></iframe>` },
      `<iframe src='${PLAYER}'></iframe>`,
    ],
    ['object: res.html có localhost -> nhánh regex lấy URL player', { html: `localhost <iframe src='${PLAYER}'>` }, PLAYER],
    ['object: domain 808gps khác', { file: 'http://video.808gps.net/play' }, 'http://video.808gps.net/play'],
    ['object: URL ngoài nhưng không phải player -> rỗng', { url: 'https://example.com/live' }, ''],
    ['object: 127.0.0.1 -> rỗng', { url: 'http://127.0.0.1/RealPlayVideo.html' }, ''],
  ])('%s', (_name, input, expected) => {
    expect(extractUrlFromLiveHtmlResponse(input)).toBe(expected)
  })

  it('bỏ URL cùng origin với trang (tránh iframe lồng chính dashboard)', () => {
    expect(extractUrlFromLiveHtmlResponse(`${window.location.origin}/808gps/RealPlayVideo.html`)).toBe('')
  })
})

describe('pickFirst', () => {
  it.each([
    [null, ['a'], ''],
    [{}, ['a'], ''],
    [{ a: '  x ' }, ['a'], 'x'],
    [{ a: '', b: '   ', c: null, d: undefined, e: 0 }, ['a', 'b', 'c', 'd', 'e'], '0'],
    [{ a: 'first', b: 'second' }, ['b', 'a'], 'second'],
    [{ a: 12 }, ['a'], '12'],
  ])('pickFirst(%j, %j) = %j', (obj, keys, expected) => {
    expect(pickFirst(obj, keys)).toBe(expected)
  })
})

describe('normalizeDriverInfo', () => {
  it.each([
    ['null', null, null],
    ['result khác 0', { result: 1, driver: { name: 'A' } }, null],
    ['result "0" (chuỗi) -> null (so sánh ===)', { result: '0', driver: { name: 'A' } }, null],
    [
      'driver object',
      { result: 0, driver: { name: ' Nguyễn A ', driverJn: '8899', phone: '0901', companyName: 'GEIC' } },
      { name: 'Nguyễn A', license: '8899', phone: '0901', company: 'GEIC', avatar: '' },
    ],
    [
      'data là mảng -> phần tử đầu; avatar tương đối có "/"',
      { result: 0, data: [{ dName: 'B', facePhotoUrl: '/img/a.jpg;/img/b.jpg' }] },
      { name: 'B', license: '', phone: '', company: '', avatar: 'https://fleetscontrol.com/img/a.jpg' },
    ],
    [
      'avatar tương đối không "/"',
      { result: 0, info: { realName: 'C', photoUrl: ' ; img/c.jpg' } },
      { name: 'C', license: '', phone: '', company: '', avatar: 'https://fleetscontrol.com/img/c.jpg' },
    ],
    [
      'avatar tuyệt đối giữ nguyên; dùng chính apiRes khi không có driver/info/data',
      { result: 0, mobile: '0912', avatar: 'http://x/y.jpg' },
      { name: '', license: '', phone: '0912', company: '', avatar: 'http://x/y.jpg' },
    ],
    ['chỉ có avatar -> null', { result: 0, driver: { avatar: 'http://x/y.jpg' } }, null],
    ['data là mảng rỗng -> null', { result: 0, data: [] }, null],
  ])('%s', (_name, input, expected) => {
    expect(normalizeDriverInfo(input)).toEqual(expected)
  })
})
