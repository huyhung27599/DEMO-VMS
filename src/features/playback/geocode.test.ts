import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enrichTimelinePlaces, nextTimelinePlaceSeq, resetGeocode, reverseGeocodeCached } from './geocode'
import { GEO_REQUEST_DELAY_MS, MAX_GEO_ENRICH_ROWS, type JournalEntry } from './lib'
import { resetPlaybackStore, usePlaybackStore } from './store'

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  resetGeocode()
  resetPlaybackStore()
  fetchMock = vi.fn(async () => okJson({ locality: 'Phường A', city: 'Quận B', principalSubdivision: '', countryName: 'Việt Nam' }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const entry = (lat: number, lng: number, addr = ''): JournalEntry => ({ type: 'start', idx: 0, p: { lat, lng, addr } })
const showEntries = (entries: JournalEntry[]) =>
  usePlaybackStore.setState({ timeline: { kind: 'entries', entries, places: {}, active: null } })
const places = () => {
  const tl = usePlaybackStore.getState().timeline
  return tl.kind === 'entries' ? tl.places : null
}

describe('reverseGeocodeCached', () => {
  it('URL bigdatacloud giống hệt bản gốc, ghép locality/city/principalSubdivision/countryName', async () => {
    await expect(reverseGeocodeCached(21.0285, 105.8542)).resolves.toBe('Phường A, Quận B, Việt Nam')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=21.0285&longitude=105.8542&localityLanguage=vi',
    )
  })

  it('không gọi fetch lần hai cho cùng tọa độ (key làm tròn 4 chữ số như bản gốc)', async () => {
    await reverseGeocodeCached(21.0285, 105.8542)
    await reverseGeocodeCached(21.0285, 105.8542)
    // 21.02851 → toFixed(4) cùng key '21.0285'
    await expect(reverseGeocodeCached(21.02851, 105.85419)).resolves.toBe('Phường A, Quận B, Việt Nam')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await reverseGeocodeCached(21.0286, 105.8542)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('lỗi (HTTP !ok hoặc fetch throw) trả "" và cũng được cache', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 500 }))
    await expect(reverseGeocodeCached(10, 106)).resolves.toBe('')
    await expect(reverseGeocodeCached(10, 106)).resolves.toBe('')
    fetchMock.mockRejectedValueOnce(new Error('net'))
    await expect(reverseGeocodeCached(11, 107)).resolves.toBe('')
    await expect(reverseGeocodeCached(11, 107)).resolves.toBe('')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('không có phần nào → ""', async () => {
    fetchMock.mockResolvedValueOnce(okJson({}))
    await expect(reverseGeocodeCached(12, 108)).resolves.toBe('')
  })
})

describe('enrichTimelinePlaces', () => {
  it(`chờ GEO_REQUEST_DELAY_MS (${GEO_REQUEST_DELAY_MS} ms) giữa các request, addr có sẵn không tra cứu`, async () => {
    vi.useFakeTimers()
    const entries = [entry(10.1, 106.1), entry(10.2, 106.2, '  12 Lê Lợi '), entry(10.3, 106.3)]
    showEntries(entries)
    const seq = nextTimelinePlaceSeq()
    const done = enrichTimelinePlaces(entries, seq)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(places()).toEqual({ 0: 'Địa điểm: Phường A, Quận B, Việt Nam' })
    await vi.advanceTimersByTimeAsync(GEO_REQUEST_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain('latitude=10.3&longitude=106.3')
    expect(places()?.[1]).toBe('Địa điểm: 12 Lê Lợi')
    await vi.advanceTimersByTimeAsync(GEO_REQUEST_DELAY_MS)
    await done
  })

  it('tọa độ khi không có tên; sau MAX_GEO_ENRICH_ROWS chỉ hiện tọa độ "(mở bản đồ để xem)"', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(async () => okJson({}))
    const entries = Array.from({ length: MAX_GEO_ENRICH_ROWS + 1 }, (_, i) => entry(10 + i / 100, 106))
    showEntries(entries)
    const done = enrichTimelinePlaces(entries, nextTimelinePlaceSeq())
    await vi.advanceTimersByTimeAsync(GEO_REQUEST_DELAY_MS * (MAX_GEO_ENRICH_ROWS + 1))
    await done
    expect(fetchMock).toHaveBeenCalledTimes(MAX_GEO_ENRICH_ROWS)
    expect(places()?.[0]).toBe('Địa điểm: 10.00000°, 106.00000°')
    expect(places()?.[MAX_GEO_ENRICH_ROWS]).toBe('Địa điểm: 10.35000°, 106.00000° (mở bản đồ để xem)')
  })

  it('dừng khi có lần tải GPS mới (seq đổi)', async () => {
    vi.useFakeTimers()
    const entries = [entry(10.1, 106.1), entry(10.2, 106.2)]
    showEntries(entries)
    const done = enrichTimelinePlaces(entries, nextTimelinePlaceSeq())
    await vi.advanceTimersByTimeAsync(0)
    nextTimelinePlaceSeq()
    await vi.advanceTimersByTimeAsync(GEO_REQUEST_DELAY_MS * 3)
    await done
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
