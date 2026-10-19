import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('leaflet', () => import('../../test/leafletMock'))
vi.mock('../../shared/map/territorial', () => ({ addTerritorialOverlays: vi.fn() }))
vi.mock('hls.js', () => ({ default: class {} }))
vi.mock('../../shared/api/endpoints', () => ({ api: { queryTrackDetail: vi.fn() } }))

import { api } from '../../shared/api/endpoints'
import { created, resetLeafletMock } from '../../test/leafletMock'
import { resetGeocode } from './geocode'
import { MAX_TRACK_PAGES, type TrackPoint } from './lib'
import { resetPlaybackStore, usePlaybackStore } from './store'
import { computeStats, fetchAllTrackRows, loadGpsTrack, onTimelineItemClick } from './track'
import { attachTrackMapContainer, getTrackPoints, resetTrackMapController } from './trackMapController'

const st = () => usePlaybackStore.getState()
const rows = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ i: from + i }))

beforeEach(() => {
  vi.useFakeTimers()
  resetLeafletMock()
  resetTrackMapController()
  resetPlaybackStore()
  resetGeocode()
  vi.mocked(api.queryTrackDetail).mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
  )
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  resetTrackMapController()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchAllTrackRows', () => {
  it('gom các trang 500 dòng tới khi trang < 500; đọc tracks/positions/datas/data', async () => {
    vi.mocked(api.queryTrackDetail)
      .mockResolvedValueOnce({ result: 0, tracks: rows(500) })
      .mockResolvedValueOnce({ result: 0, positions: rows(500, 500) })
      .mockResolvedValueOnce({ result: 0, datas: rows(3, 1000) })
    const r = await fetchAllTrackRows('DEV', 'b', 'e')
    expect(r.rows).toHaveLength(1003)
    expect(r.mayHaveMore).toBe(false)
    expect(vi.mocked(api.queryTrackDetail).mock.calls).toEqual([
      ['DEV', 'b', 'e', 1, 500],
      ['DEV', 'b', 'e', 2, 500],
      ['DEV', 'b', 'e', 3, 500],
    ])
  })

  it('trang rỗng / lỗi ở trang > 1 → dừng; lỗi trang 1 → throw msg', async () => {
    vi.mocked(api.queryTrackDetail)
      .mockResolvedValueOnce({ result: 0, data: rows(500) })
      .mockResolvedValueOnce({ result: 0, data: [] })
    await expect(fetchAllTrackRows('D', 'b', 'e')).resolves.toEqual({ rows: rows(500), mayHaveMore: false })
    vi.mocked(api.queryTrackDetail)
      .mockResolvedValueOnce({ result: 0, data: rows(500) })
      .mockResolvedValueOnce({ result: 1 })
    await expect(fetchAllTrackRows('D', 'b', 'e')).resolves.toMatchObject({ mayHaveMore: false })
    vi.mocked(api.queryTrackDetail).mockResolvedValueOnce({ result: 2, msg: 'boom' })
    await expect(fetchAllTrackRows('D', 'b', 'e')).rejects.toThrow('boom')
    vi.mocked(api.queryTrackDetail).mockResolvedValueOnce(null as never)
    await expect(fetchAllTrackRows('D', 'b', 'e')).rejects.toThrow('queryTrackDetail failed')
  })

  it(`dừng ở MAX_TRACK_PAGES (${MAX_TRACK_PAGES}) trang đầy → mayHaveMore`, async () => {
    vi.mocked(api.queryTrackDetail).mockImplementation(async () => ({ result: 0, tracks: rows(500) }))
    const r = await fetchAllTrackRows('D', 'b', 'e')
    expect(api.queryTrackDetail).toHaveBeenCalledTimes(MAX_TRACK_PAGES)
    expect(r.mayHaveMore).toBe(true)
    expect(r.rows).toHaveLength(500 * MAX_TRACK_PAGES)
  })
})

describe('computeStats', () => {
  const P = (speed: number, time: string, lat = 10, lng = 106): TrackPoint => ({ lat, lng, speed, time, addr: '' })
  it.each([
    {
      name: 'rỗng → không đổi',
      points: [] as TrackPoint[],
      want: undefined,
    },
    {
      name: '1 điểm → duration --',
      points: [P(50, '2026-01-01 08:00:00')],
      want: { distance: '0.00 km', maxspeed: '0 km/h', duration: '--', points: '1' },
    },
    {
      name: 'di chuyển 10 phút, tốc độ tối đa bỏ qua điểm đầu',
      points: [P(90, '2026-01-01 08:00:00'), P(40, '2026-01-01 08:10:00', 10.01), P(2, '2026-01-01 08:20:00', 10.01)],
      want: { distance: '1.11 km', maxspeed: '40 km/h', duration: '20p 00s', points: '3' },
    },
    {
      name: 'khoảng > 15 phút không tính; dừng (≤3 km/h) không tính',
      points: [P(10, '2026-01-01 08:00:00'), P(10, '2026-01-01 09:00:00'), P(1, '2026-01-01 09:01:00'), P(2, '2026-01-01 09:02:00')],
      want: { distance: '0.00 km', maxspeed: '10 km/h', duration: '1p 00s', points: '4' },
    },
    {
      name: 'trên 1 giờ',
      points: [
        P(30, '2026-01-01 08:00:00'),
        ...Array.from({ length: 8 }, (_, i) => P(30, `2026-01-01 ${String(8 + Math.floor(((i + 1) * 10) / 60)).padStart(2, '0')}:${String(((i + 1) * 10) % 60).padStart(2, '0')}:00`)),
      ],
      want: { distance: '0.00 km', maxspeed: '30 km/h', duration: '1h 20p', points: '9' },
    },
  ])('$name', ({ points, want }) => {
    expect(computeStats(points)).toEqual(want)
    if (want) expect(st().stats).toEqual(want)
    else expect(st().stats.distance).toBe('--')
  })
})

describe('loadGpsTrack', () => {
  const row = (i: number, speed = 40) => ({
    lat: 10 + i * 0.01,
    lng: 106,
    speed,
    gpsTime: `2026-10-19 08:${String(i * 2).padStart(2, '0')}:00`,
  })

  it('không có điểm → "Không có dữ liệu GPS", timeline rỗng', async () => {
    vi.mocked(api.queryTrackDetail).mockResolvedValueOnce({ result: 0, tracks: [{ lat: 0, lng: 0 }] })
    await loadGpsTrack('D', 'b', 'e')
    expect(st().trackStatus).toEqual({ text: 'Không có dữ liệu GPS', active: false })
    expect(st().timeline).toEqual({ kind: 'empty' })
    expect(st().timelineCount).toBe('0 điểm')
  })

  it('lỗi → "Lỗi tải GPS"', async () => {
    vi.mocked(api.queryTrackDetail).mockResolvedValueOnce({ result: 5, msg: 'x' })
    await loadGpsTrack('D', 'b', 'e')
    expect(st().trackStatus).toEqual({ text: 'Lỗi tải GPS', active: false })
  })

  it('có điểm → bản đồ, nhật ký bắt đầu/kết thúc, thống kê, trạng thái, tra cứu địa điểm', async () => {
    const el = document.createElement('div')
    attachTrackMapContainer(el)
    vi.mocked(api.queryTrackDetail).mockResolvedValueOnce({ result: 0, tracks: [row(2), row(0), row(1)] })
    await loadGpsTrack('D', 'b', 'e')
    expect(created.maps).toHaveLength(1)
    expect(getTrackPoints()).toHaveLength(3)
    expect(st().trackStatus).toEqual({ text: '3 điểm GPS', active: true })
    expect(st().timelineCount).toBe('2 sự kiện')
    const tl = st().timeline
    expect(tl.kind).toBe('entries')
    if (tl.kind !== 'entries') return
    expect(tl.entries.map((e) => e.type)).toEqual(['start', 'end'])
    expect(tl.entries[0].p.time).toBe('2026-10-19 08:00:00')
    expect(st().stats.points).toBe('3')
    // OSRM (1 chunk) + bigdatacloud
    await vi.advanceTimersByTimeAsync(0)
    const urls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]))
    expect(urls[0]).toMatch(/^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\//)
    expect(urls[1]).toMatch(/^https:\/\/api\.bigdatacloud\.net\/data\/reverse-geocode-client\?latitude=10&/)
  })

  it('click nhật ký: active-point + phát video từ mốc đó khi đã có xe', async () => {
    attachTrackMapContainer(document.createElement('div'))
    vi.mocked(api.queryTrackDetail).mockResolvedValueOnce({ result: 0, tracks: [row(0), row(1)] })
    await loadGpsTrack('D', 'b', 'e')
    const tl = st().timeline
    if (tl.kind !== 'entries') throw new Error('no entries')
    onTimelineItemClick(tl.entries, 1)
    const after = st().timeline
    expect(after.kind === 'entries' && after.active).toBe(1)
    expect(created.maps[0].flyTo).toHaveBeenCalledTimes(1)
    // chưa có currentDevice → không đổi trình phát
    expect(st().player).toEqual({ kind: 'initial' })
  })
})
