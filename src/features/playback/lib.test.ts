import { describe, expect, it } from 'vitest'
import {
  buildGpsJournalEntries,
  detectParkStops,
  extractPlaybackHtmlUrl,
  formatDt,
  getVehicleDeviceId,
  injectUpstreamSessionIntoUrl,
  localDt,
  normalizeFileTime,
  normalizeTrackRow,
  rewriteVendorPlaybackRangeInUrl,
  secondsToHms,
  toApiChannelId,
  toPlayerChannelParam,
  toUiChannelId,
  toVendorTimeParam,
} from './lib'

describe('localDt (playback.js:23-24)', () => {
  it.each([
    [new Date(2026, 9, 19, 13, 45, 12), false, '2026-10-19T00:00'],
    [new Date(2026, 9, 19, 13, 45, 12), true, '2026-10-19T23:59'],
    [new Date(2026, 0, 5, 0, 0, 0), false, '2026-01-05T00:00'],
    [new Date(2026, 0, 5, 23, 59, 59), true, '2026-01-05T23:59'],
    [new Date(2025, 11, 31, 8, 0, 0), true, '2025-12-31T23:59'],
    [new Date(2024, 1, 29, 12, 0, 0), false, '2024-02-29T00:00'],
  ])('%s end=%s -> %s', (d, end, expected) => {
    expect(localDt(d, end)).toBe(expected)
  })

  it('không truyền ngày -> hôm nay', () => {
    const now = new Date()
    expect(localDt()).toBe(localDt(now))
  })
})

describe('format/kênh', () => {
  it('formatDt: datetime-local -> "YYYY-MM-DD HH:mm:00"', () => {
    expect(formatDt('2026-10-19T00:00')).toBe('2026-10-19 00:00:00')
    expect(formatDt('')).toBe('')
  })
  it('toVendorTimeParam thay dấu cách đầu tiên bằng T', () => {
    expect(toVendorTimeParam('2026-10-19 00:00:00')).toBe('2026-10-19T00:00:00')
    expect(toVendorTimeParam(undefined)).toBe('')
  })
  it('toApiChannelId / toUiChannelId / toPlayerChannelParam', () => {
    expect(['1', '4', '0', '5', 'x'].map(toApiChannelId)).toEqual(['0', '3', '0', '0', '0'])
    expect(['1', '4', '0', '3', '9', 'x'].map(toUiChannelId)).toEqual(['1', '4', '1', '3', '1', '1'])
    expect(['1', '4', '0', 'x'].map(toPlayerChannelParam)).toEqual(['1', '4', '0', '0'])
  })
  it('secondsToHms', () => {
    expect(secondsToHms(3725)).toBe('1h 02p')
    expect(secondsToHms(125)).toBe('2p 05s')
  })
})

describe('getVehicleDeviceId', () => {
  it('ưu tiên dl[].id rồi các trường của xe', () => {
    expect(getVehicleDeviceId({ dl: [{ id: 'D1' }], devIdno: 'X' })).toBe('D1')
    expect(getVehicleDeviceId({ dl: [null, { devIdno: 'D2' }] })).toBe('D2')
    expect(getVehicleDeviceId({ vehiIdno: '29A' })).toBe('29A')
    expect(getVehicleDeviceId(null)).toBe('')
  })
})

describe('normalizeFileTime', () => {
  it('chuỗi datetime / số giây / khác', () => {
    expect(normalizeFileTime(' 2026-10-19 01:02:03 ', '2026-10-19 00:00:00')).toBe('2026-10-19 01:02:03')
    expect(normalizeFileTime('3725', '2026-10-19 00:00:00')).toBe('2026-10-19 01:02:05')
    expect(normalizeFileTime(90061, '2026-10-19 00:00:00')).toBe('2026-10-19 01:01:01')
    expect(normalizeFileTime(null, '2026-10-19 00:00:00')).toBe('')
  })
})

describe('URL helpers', () => {
  it('injectUpstreamSessionIntoUrl thay jsession/sid... hoặc thêm jsession', () => {
    expect(injectUpstreamSessionIntoUrl('https://a.com/p?jsession=old&x=1', 'NEW')).toBe(
      'https://a.com/p?jsession=NEW&x=1',
    )
    expect(injectUpstreamSessionIntoUrl('/p?x=1', 'NEW')).toBe('/p?x=1&jsession=NEW')
    expect(injectUpstreamSessionIntoUrl('', 'NEW')).toBe('')
  })
  it('rewriteVendorPlaybackRangeInUrl chỉ áp dụng cho player playback', () => {
    expect(
      rewriteVendorPlaybackRangeInUrl(
        'https://fleetscontrol.com/808gps/open/player/PlayBackVideo.html?begintime=a',
        '2026-10-19 00:00:00',
        '2026-10-19 23:59:00',
      ),
    ).toBe(
      'https://fleetscontrol.com/808gps/open/player/PlayBackVideo.html?begintime=2026-10-19T00%3A00%3A00&endtime=2026-10-19T23%3A59%3A00',
    )
    expect(rewriteVendorPlaybackRangeInUrl('https://a.com/live.html', 'x', 'y')).toBe('https://a.com/live.html')
  })
  it('extractPlaybackHtmlUrl: chỉ nhận URL player vendor', () => {
    expect(extractPlaybackHtmlUrl({ url: 'https://fleetscontrol.com/808gps/x.html' })).toBe(
      'https://fleetscontrol.com/808gps/x.html',
    )
    expect(extractPlaybackHtmlUrl({ html: '<iframe src="https://h.com/player/a.html"></iframe>' })).toBe(
      'https://h.com/player/a.html',
    )
    expect(extractPlaybackHtmlUrl({ url: 'http://localhost:4000/player/a' })).toBe('')
    expect(extractPlaybackHtmlUrl(null)).toBe('')
  })
})

describe('GPS helpers (playback.js:1090-1195)', () => {
  it('normalizeTrackRow chia 1e6 khi toạ độ > 1000', () => {
    expect(normalizeTrackRow({ lat: 21000000, lng: 105500000, sp: '40', gt: '2026-10-19 01:00:00', ps: ' HN ' })).toEqual({
      lat: 21,
      lng: 105.5,
      speed: 40,
      time: '2026-10-19 01:00:00',
      addr: 'HN',
    })
  })
  it('detectParkStops + buildGpsJournalEntries: đỗ >= 30 phút', () => {
    const pts = [
      { lat: 1, lng: 1, speed: 50, time: '2026-10-19 00:00:00', addr: '' },
      { lat: 2, lng: 2, speed: 0, time: '2026-10-19 00:10:00', addr: '' },
      { lat: 2, lng: 2, speed: 0, time: '2026-10-19 00:25:00', addr: 'P' },
      { lat: 2, lng: 2, speed: 0, time: '2026-10-19 00:40:00', addr: '' },
      { lat: 3, lng: 3, speed: 50, time: '2026-10-19 00:45:00', addr: '' },
    ]
    const stops = detectParkStops(pts)
    expect(stops).toHaveLength(1)
    expect(stops[0]).toMatchObject({ startIdx: 1, endIdx: 3, centerIdx: 2, durationSec: 1800, addr: 'P' })
    expect(buildGpsJournalEntries(pts, stops).map((e) => [e.type, e.idx])).toEqual([
      ['start', 0],
      ['park', 2],
      ['end', 4],
    ])
    // 29 phút -> không phải điểm đỗ
    const short = pts.map((p, i) => (i === 3 ? { ...p, time: '2026-10-19 00:39:00' } : p))
    expect(detectParkStops(short)).toEqual([])
  })
})
