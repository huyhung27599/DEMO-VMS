import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'

vi.mock('hls.js', () => ({ default: class {} }))
vi.mock('../../shared/api/endpoints', () => ({
  api: {
    BASE_URL: 'http://localhost:4000/api/',
    queryUserVehicle: vi.fn(),
    getUpstreamSession: vi.fn(),
    getUpstreamLoginServer: vi.fn(),
    getPlaybackVideoHtml: vi.fn(),
    getPlaybackVideoH5: vi.fn(),
    sendRecordVideo: vi.fn(),
    getPlaybackVideoAddress: vi.fn(),
  },
}))
vi.mock('./track', () => ({ loadGpsTrack: vi.fn(async () => {}) }))

import { renderWithProviders } from '../../test/renderWithProviders'
import { notifyNavItemClick, notifySectionShown } from '../../app/useActiveSection'
import { api } from '../../shared/api/endpoints'
import { useToastStore } from '../../shared/ui/toastStore'
import { playbackInit, resetPlaybackInit } from './init'
import { localDt } from './lib'
import { PlaybackSection } from './PlaybackSection'
import { resetPlaybackStore, usePlaybackStore } from './store'
import { loadGpsTrack } from './track'
import { setTrackMap } from './videoController'

const VEHICLES = [{ nm: '29A-123', dl: [{ id: 'DEV1' }] }, { vehiIdno: 'V2' }, {}]

async function settle(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const select = () => screen.getByLabelText('Phương tiện') as HTMLSelectElement
const optionTexts = () => within(select()).getAllByRole('option').map((o) => o.textContent)
const searchBtn = () => document.getElementById('pb-search-btn') as HTMLButtonElement
const toasts = () => useToastStore.getState().toasts.map((t) => [t.message, t.type])

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
  sessionStorage.setItem('dashcam_auth_token', 'tok')
  resetPlaybackInit()
  resetPlaybackStore()
  useToastStore.setState({ toasts: [] })
  for (const fn of Object.values(api)) if (typeof fn === 'function') vi.mocked(fn).mockReset()
  vi.mocked(loadGpsTrack).mockReset().mockResolvedValue(undefined)
  vi.mocked(api.queryUserVehicle).mockResolvedValue({ result: 0, vehicles: VEHICLES })
  vi.mocked(api.getUpstreamSession).mockResolvedValue({ result: 0, upstreamJsession: 'JSESS' })
  vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({
    result: 0,
    url: 'https://fleetscontrol.com/808gps/open/player/PlayBackVideo.html?jsession=OLD',
  })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  setTrackMap(null)
})

describe('PlaybackSection — init + dropdown xe', () => {
  it('trước playbackInit: markup index.html, không gọi API', async () => {
    renderWithProviders(<PlaybackSection hidden={false} />)
    await settle(1000)
    expect(screen.getByText('Phát lại video & hành trình')).toBeInTheDocument()
    expect(optionTexts()).toEqual(['-- Chọn phương tiện --'])
    expect(screen.getAllByText('Chưa có dữ liệu')).toHaveLength(2)
    expect(screen.getByText('Bản đồ hành trình sau khi tìm kiếm')).toBeInTheDocument()
    expect(document.getElementById('pb-filelist-card')).not.toBeVisible()
    expect(api.queryUserVehicle).not.toHaveBeenCalled()
  })

  it('playbackInit gọi hai lần (StrictMode): đặt giờ bắt đầu/kết thúc, chỉ tải danh sách xe một lần', async () => {
    renderWithProviders(<PlaybackSection hidden={false} />, { strict: true })
    await settle()
    let resolve!: (v: unknown) => void
    vi.mocked(api.queryUserVehicle).mockReturnValue(new Promise((r) => (resolve = r)) as never)
    act(() => {
      playbackInit()
      playbackInit()
    })
    await settle()
    expect(optionTexts()).toEqual(['Đang tải...'])
    await act(async () => resolve({ result: 0, vehicles: VEHICLES }))
    await settle()
    expect(optionTexts()).toEqual(['-- Chọn phương tiện --', '29A-123', 'V2', 'Xe 3'])
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
    expect((document.getElementById('pb-begin-time') as HTMLInputElement).value).toBe(localDt(new Date()))
    expect((document.getElementById('pb-end-time') as HTMLInputElement).value).toBe(localDt(new Date(), true))
    act(() => playbackInit())
    await settle(5000)
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
  })

  it('lỗi tải -> "Lỗi tải danh sách"', async () => {
    vi.mocked(api.queryUserVehicle).mockResolvedValue({ result: 5 })
    renderWithProviders(<PlaybackSection hidden={false} />)
    act(() => playbackInit())
    await settle()
    expect(optionTexts()).toEqual(['Lỗi tải danh sách'])
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
  })
})

describe('PlaybackSection — tìm kiếm (onSearch playback.js:496-556)', () => {
  async function ready() {
    const r = renderWithProviders(<PlaybackSection hidden={false} />)
    act(() => playbackInit())
    await settle()
    return r
  }

  it('kiểm tra đầu vào theo thứ tự gốc, mỗi lần một toast cảnh báo, không gọi API', async () => {
    await ready()
    fireEvent.click(searchBtn())
    await settle()
    expect(toasts()).toEqual([['Vui lòng chọn phương tiện!', 'warning']])

    fireEvent.change(select(), { target: { value: '0' } })
    act(() => usePlaybackStore.setState({ beginTime: '' }))
    fireEvent.click(searchBtn())
    await settle()
    expect(toasts()[1]).toEqual(['Vui lòng chọn khoảng thời gian!', 'warning'])

    act(() => usePlaybackStore.setState({ beginTime: '2026-10-19T23:59', endTime: '2026-10-19T23:59' }))
    fireEvent.click(searchBtn())
    await settle()
    expect(toasts()[2]).toEqual(['Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!', 'warning'])
    expect(api.getUpstreamSession).not.toHaveBeenCalled()
  })

  it('tìm kiếm: biển số/khung giờ, nút "Đang tìm...", trạng thái "Đang tải...", trình phát rồi loadGpsTrack, invalidateSize sau 400 ms', async () => {
    await ready()
    const map = { invalidateSize: vi.fn() }
    setTrackMap(map)
    act(() => usePlaybackStore.setState({ beginTime: '2026-10-19T00:00', endTime: '2026-10-19T23:59' }))
    let resolveHtml!: (v: unknown) => void
    vi.mocked(api.getPlaybackVideoHtml).mockReturnValue(new Promise((r) => (resolveHtml = r)) as never)
    fireEvent.change(select(), { target: { value: '0' } })
    fireEvent.click(searchBtn())
    await settle()

    expect(screen.getByText('29A-123', { selector: '#pb-player-plate' })).toBeInTheDocument()
    expect(document.getElementById('pb-player-time')).toHaveTextContent('2026-10-19 00:00 → 2026-10-19 23:59')
    expect(searchBtn()).toHaveTextContent('Đang tìm...')
    expect(screen.getAllByText('Đang tải...')).toHaveLength(2)
    expect(screen.getByText('Đang chuẩn bị trình phát...')).toBeInTheDocument()
    expect(loadGpsTrack).not.toHaveBeenCalled()

    await act(async () =>
      resolveHtml({ result: 0, url: 'https://fleetscontrol.com/808gps/open/player/PlayBackVideo.html?jsession=OLD' }),
    )
    expect(api.getPlaybackVideoHtml).toHaveBeenCalledWith(
      'DEV1',
      '0',
      '2026-10-19 00:00:00',
      '2026-10-19 23:59:00',
      'en',
      '1',
    )
    const iframe = document.querySelector('#pb-player-area iframe') as HTMLIFrameElement
    expect(iframe.src).toContain('jsession=JSESS')
    expect(iframe.getAttribute('allow')).toBe('autoplay; fullscreen')
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer-when-downgrade')
    expect(loadGpsTrack).toHaveBeenCalledWith('DEV1', '2026-10-19 00:00:00', '2026-10-19 23:59:00')
    expect(vi.mocked(loadGpsTrack).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(api.getPlaybackVideoHtml).mock.invocationCallOrder[0],
    )
    expect(searchBtn()).toHaveTextContent('Tìm kiếm')
    expect(usePlaybackStore.getState().rightTab).toBe('map')
    // switchRightTab('map') -> +300 ms; sau loadGpsTrack -> +400 ms
    await settle(300)
    expect(map.invalidateSize).toHaveBeenCalledTimes(1)
    await settle(100)
    expect(map.invalidateSize).toHaveBeenCalledTimes(2)
    expect(toasts()).toEqual([])
  })

  it('lỗi trong khối try -> toast "Lỗi khi tải trình phát video", nút trở lại "Tìm kiếm"', async () => {
    await ready()
    vi.mocked(loadGpsTrack).mockRejectedValue(new Error('x'))
    fireEvent.change(select(), { target: { value: '0' } })
    fireEvent.click(searchBtn())
    await settle()
    expect(toasts()).toEqual([['Lỗi khi tải trình phát video', 'error']])
    expect(searchBtn()).toHaveTextContent('Tìm kiếm')
  })

  it('xe không có thiết bị -> không tải GPS', async () => {
    vi.mocked(api.queryUserVehicle).mockResolvedValue({ result: 0, vehicles: [{}] })
    await ready()
    fireEvent.change(select(), { target: { value: '0' } })
    fireEvent.click(searchBtn())
    await settle()
    expect(document.getElementById('pb-player-plate')).toHaveTextContent('N/A')
    expect(loadGpsTrack).not.toHaveBeenCalled()
  })
})

describe('PlaybackSection — handleResize (main.js:164-166, playback.js:1957-1959)', () => {
  it("onSectionShown('playback') -> +300 và +800 ms; click nav playback -> +220 ms (mỗi lần click)", async () => {
    renderWithProviders(<PlaybackSection hidden={false} />)
    await settle()
    const map = { invalidateSize: vi.fn() }
    setTrackMap(map)

    notifySectionShown('playback')
    await settle(299)
    expect(map.invalidateSize).toHaveBeenCalledTimes(0)
    await settle(1)
    expect(map.invalidateSize).toHaveBeenCalledTimes(1)
    await settle(499)
    expect(map.invalidateSize).toHaveBeenCalledTimes(1)
    await settle(1)
    expect(map.invalidateSize).toHaveBeenCalledTimes(2)

    notifyNavItemClick('playback')
    notifyNavItemClick('playback')
    await settle(219)
    expect(map.invalidateSize).toHaveBeenCalledTimes(2)
    await settle(1)
    expect(map.invalidateSize).toHaveBeenCalledTimes(4)
    await settle(2000)
    expect(map.invalidateSize).toHaveBeenCalledTimes(4)
  })
})
