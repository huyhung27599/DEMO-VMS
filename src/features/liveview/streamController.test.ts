import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hlsMock = vi.hoisted(() => {
  type Handler = (event: string, data: unknown) => void
  const instances: FakeHls[] = []
  class FakeHls {
    static isSupported = vi.fn(() => true)
    static Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError' }
    config: unknown
    handlers: Record<string, Handler> = {}
    loadSource = vi.fn()
    attachMedia = vi.fn()
    destroy = vi.fn()
    on = vi.fn((ev: string, fn: Handler) => {
      this.handlers[ev] = fn
    })
    constructor(config: unknown) {
      this.config = config
      instances.push(this)
    }
  }
  return { FakeHls, instances }
})

vi.mock('hls.js', () => ({ default: hlsMock.FakeHls }))
vi.mock('../../shared/api/endpoints', () => ({
  api: {
    BASE_URL: 'http://localhost:4000/api/',
    realTimeVideo: vi.fn(),
    getLiveVideoHtml: vi.fn(),
    getLiveVideoAddress: vi.fn(),
    getUpstreamSession: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import {
  getKeepaliveState,
  playHlsStream,
  reloadActiveIframe,
  resetStreamController,
  resolveUnifiedPlayerUrl,
  startKeepalive,
  stopKeepalive,
} from './streamController'

const PLAYER = 'https://fleetscontrol.com/808gps/open/player/RealPlayVideo.html?jsession=x'

function makeIframe(src = 'https://fleetscontrol.com/player?a=1'): HTMLIFrameElement {
  const f = document.createElement('iframe')
  f.src = src
  return f
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  resetStreamController()
  vi.mocked(api.realTimeVideo).mockReset().mockResolvedValue({ result: 0 })
  vi.mocked(api.getLiveVideoHtml).mockReset()
  vi.mocked(api.getLiveVideoAddress).mockReset()
  vi.mocked(api.getUpstreamSession).mockReset()
  hlsMock.instances.length = 0
  hlsMock.FakeHls.isSupported.mockReset().mockReturnValue(true)
})
afterEach(() => {
  resetStreamController()
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('keepalive', () => {
  it('gọi realTimeVideo(deviceId, 0, 1, 1, 300) mỗi 60 000 ms', async () => {
    startKeepalive('DEV1', makeIframe())
    await vi.advanceTimersByTimeAsync(59_999)
    expect(api.realTimeVideo).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.realTimeVideo).toHaveBeenCalledTimes(1)
    expect(api.realTimeVideo).toHaveBeenCalledWith('DEV1', 0, 1, 1, 300)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.realTimeVideo).toHaveBeenCalledTimes(2)
  })

  it('gọi lại startKeepalive thì dừng timer cũ (chỉ thiết bị mới được ping)', async () => {
    startKeepalive('DEV1', makeIframe())
    await vi.advanceTimersByTimeAsync(30_000)
    const iframe2 = makeIframe()
    startKeepalive('DEV2', iframe2)
    expect(getKeepaliveState()).toEqual({ deviceId: 'DEV2', iframe: iframe2, running: true })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.realTimeVideo).toHaveBeenCalledTimes(1)
    expect(api.realTimeVideo).toHaveBeenCalledWith('DEV2', 0, 1, 1, 300)
  })

  it('stopKeepalive dừng hẳn', async () => {
    startKeepalive('DEV1', makeIframe())
    stopKeepalive()
    expect(getKeepaliveState()).toEqual({ deviceId: null, iframe: null, running: false })
    await vi.advanceTimersByTimeAsync(180_000)
    expect(api.realTimeVideo).not.toHaveBeenCalled()
  })

  it('2 lần heartbeat lỗi liên tiếp -> reloadActiveIframe (src = "" rồi khôi phục sau 500 ms)', async () => {
    vi.mocked(api.realTimeVideo).mockResolvedValue({ result: 1, msg: 'x' })
    const iframe = makeIframe('https://fleetscontrol.com/p?x=1')
    startKeepalive('DEV1', iframe)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(iframe.getAttribute('src')).toBe('https://fleetscontrol.com/p?x=1')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(iframe.getAttribute('src')).toBe('')
    await vi.advanceTimersByTimeAsync(499)
    expect(iframe.getAttribute('src')).toBe('')
    await vi.advanceTimersByTimeAsync(1)
    expect(iframe.getAttribute('src')).toBe('https://fleetscontrol.com/p?x=1')
    // bộ đếm về 0: lần lỗi kế tiếp chưa reload
    await vi.advanceTimersByTimeAsync(60_000)
    expect(iframe.getAttribute('src')).toBe('https://fleetscontrol.com/p?x=1')
  })

  it('heartbeat ném lỗi cũng tính là thất bại; thành công thì reset bộ đếm', async () => {
    vi.mocked(api.realTimeVideo)
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce({ result: 0 })
      .mockRejectedValueOnce(new Error('net'))
      .mockRejectedValueOnce(new Error('net'))
    const iframe = makeIframe('https://fleetscontrol.com/p')
    startKeepalive('DEV1', iframe)
    await vi.advanceTimersByTimeAsync(180_000)
    expect(iframe.getAttribute('src')).toBe('https://fleetscontrol.com/p')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(iframe.getAttribute('src')).toBe('')
  })

  it('tab hiện lại (visibilitychange -> visible) khi có iframe active -> reload', async () => {
    const iframe = makeIframe('https://fleetscontrol.com/p')
    startKeepalive('DEV1', iframe)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(iframe.getAttribute('src')).toBe('')
    await vi.advanceTimersByTimeAsync(500)
    expect(iframe.getAttribute('src')).toBe('https://fleetscontrol.com/p')
    stopKeepalive()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(iframe.getAttribute('src')).toBe('https://fleetscontrol.com/p')
  })

  it('reloadActiveIframe không làm gì khi chưa có iframe', () => {
    expect(() => reloadActiveIframe()).not.toThrow()
  })
})

describe('resolveUnifiedPlayerUrl', () => {
  const args = { deviceId: 'DEV1', plateNum: '51A 123', upstreamJsession: 'js/1' }
  const FALLBACK =
    'https://fleetscontrol.com/808gps/open/player/RealPlayVideo.html?jsession=js%2F1&PlateNum=51A%20123&channel=0&showChnList=false&close=0&closeMins=0&lang=en'

  it('ưu tiên URL lấy từ getLiveVideoHtml(deviceId, 0, "en")', async () => {
    vi.mocked(api.getLiveVideoHtml).mockResolvedValue({ result: 0, url: PLAYER })
    await expect(resolveUnifiedPlayerUrl(args)).resolves.toBe(PLAYER)
    expect(api.getLiveVideoHtml).toHaveBeenCalledWith('DEV1', 0, 'en')
  })

  it('res.html chứa iframe: extract trả nguyên HTML (không bắt đầu bằng http) -> URL dự phòng (bug gốc)', async () => {
    vi.mocked(api.getLiveVideoHtml).mockResolvedValue({ result: 0, html: `<iframe src="${PLAYER}"></iframe>` })
    await expect(resolveUnifiedPlayerUrl(args)).resolves.toBe(FALLBACK)
  })

  it('không có URL hợp lệ -> URL RealPlay dự phòng', async () => {
    vi.mocked(api.getLiveVideoHtml).mockResolvedValue({ result: 0 })
    await expect(resolveUnifiedPlayerUrl(args)).resolves.toBe(FALLBACK)
  })

  it('getLiveVideoHtml ném lỗi -> URL dự phòng', async () => {
    vi.mocked(api.getLiveVideoHtml).mockRejectedValue(new Error('x'))
    await expect(resolveUnifiedPlayerUrl(args)).resolves.toBe(FALLBACK)
  })
})

describe('playHlsStream (code chết trong bản gốc, giữ nguyên)', () => {
  function mountTile() {
    document.body.innerHTML = `
      <div class="video-tile">
        <video id="v1"></video>
        <div id="v1-loader">Loading</div>
        <span id="v1-status">...</span>
      </div>`
    return {
      video: document.getElementById('v1') as HTMLVideoElement,
      loader: document.getElementById('v1-loader') as HTMLElement,
      status: document.getElementById('v1-status') as HTMLElement,
    }
  }

  async function run(p: Promise<void>) {
    await vi.advanceTimersByTimeAsync(400)
    await p
  }

  it('không có thẻ video -> không gọi API', async () => {
    await playHlsStream('DEV1', 1, 'missing', '51A')
    expect(api.realTimeVideo).not.toHaveBeenCalled()
  })

  it('Hls hỗ trợ: realTimeVideo, chờ 400 ms, getLiveVideoAddress, new Hls({lowLatencyMode}) + loadSource/attachMedia', async () => {
    const { video, loader, status } = mountTile()
    vi.mocked(api.getLiveVideoAddress).mockResolvedValue({ result: 0, url: 'http://s/x.m3u8' })
    const p = playHlsStream('DEV1', 2, 'v1', '51A')
    await vi.advanceTimersByTimeAsync(399)
    expect(api.getLiveVideoAddress).not.toHaveBeenCalled()
    await run(p)
    expect(api.realTimeVideo).toHaveBeenCalledWith('DEV1', 2, 1, 1, 300)
    expect(api.getLiveVideoAddress).toHaveBeenCalledWith('DEV1', 2, 1)
    expect(hlsMock.instances).toHaveLength(1)
    const hls = hlsMock.instances[0]
    expect(hls.config).toEqual({ lowLatencyMode: true })
    expect(hls.loadSource).toHaveBeenCalledWith('http://s/x.m3u8')
    expect(hls.attachMedia).toHaveBeenCalledWith(video)
    expect(loader.style.display).toBe('none')
    expect(status.textContent).toBe('ONLINE')
    expect(hls.destroy).not.toHaveBeenCalled()
  })

  it('Hls.Events.ERROR: chỉ lỗi fatal mới đặt trạng thái ERROR', async () => {
    const { status } = mountTile()
    vi.mocked(api.getLiveVideoAddress).mockResolvedValue({ result: 0, file: 'http://s/y.m3u8' })
    await run(playHlsStream('DEV1', 1, 'v1', '51A'))
    const hls = hlsMock.instances[0]
    hls.handlers['hlsError']('hlsError', { fatal: false })
    expect(status.textContent).toBe('ONLINE')
    hls.handlers['hlsError']('hlsError', { fatal: true })
    expect(status.textContent).toBe('ERROR')
    expect(status.style.color).toBe('var(--color-danger)')
    expect(hls.destroy).not.toHaveBeenCalled()
  })

  it('MANIFEST_PARSED -> video.play()', async () => {
    const { video } = mountTile()
    const play = vi.fn(() => Promise.resolve())
    video.play = play
    vi.mocked(api.getLiveVideoAddress).mockResolvedValue({ result: 0, address: 'http://s/z.m3u8' })
    await run(playHlsStream('DEV1', 1, 'v1', '51A'))
    hlsMock.instances[0].handlers['hlsManifestParsed']('hlsManifestParsed', {})
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('Hls.isSupported() false + HLS gốc (Safari) -> video.src; lỗi video -> ERROR', async () => {
    hlsMock.FakeHls.isSupported.mockReturnValue(false)
    const { video, status } = mountTile()
    video.canPlayType = vi.fn(() => 'maybe' as CanPlayTypeResult)
    vi.mocked(api.getLiveVideoAddress).mockResolvedValue({ result: 0, url: 'http://s/x.m3u8' })
    await run(playHlsStream('DEV1', 1, 'v1', '51A'))
    expect(hlsMock.instances).toHaveLength(0)
    expect(video.canPlayType).toHaveBeenCalledWith('application/vnd.apple.mpegurl')
    expect(video.getAttribute('src')).toBe('http://s/x.m3u8')
    video.dispatchEvent(new Event('error'))
    expect(status.textContent).toBe('ERROR')
  })

  it('không hỗ trợ HLS -> "Browser does not support HLS"', async () => {
    hlsMock.FakeHls.isSupported.mockReturnValue(false)
    const { video, loader } = mountTile()
    video.canPlayType = vi.fn(() => '' as CanPlayTypeResult)
    vi.mocked(api.getLiveVideoAddress).mockResolvedValue({ result: 0, url: 'http://s/x.m3u8' })
    await run(playHlsStream('DEV1', 1, 'v1', '51A'))
    expect(loader.style.display).toBe('block')
    expect(loader.textContent).toBe('Browser does not support HLS')
  })

  it('không có URL stream -> iframe RealPlay thay thẻ video, trạng thái PLAYER', async () => {
    const { status, loader } = mountTile()
    vi.mocked(api.getLiveVideoAddress).mockResolvedValue({ result: 1 })
    vi.mocked(api.getUpstreamSession).mockResolvedValue({ result: 0, upstreamJsession: 'J' })
    await run(playHlsStream('DEV1', 3, 'v1', ' 51A '))
    expect(document.getElementById('v1')).toBeNull()
    const iframe = document.querySelector('.video-tile iframe') as HTMLIFrameElement
    expect(iframe.getAttribute('src')).toBe(
      'https://fleetscontrol.com/808gps/open/player/RealPlayVideo.html?jsession=J&PlateNum=51A&previewChn=2&showChnList=false&lang=en',
    )
    expect(loader.style.display).toBe('none')
    expect(status.textContent).toBe('PLAYER')
  })

  it('dự phòng cũng lỗi -> "Stream Not Available" + ERROR', async () => {
    const { status, loader } = mountTile()
    vi.mocked(api.getLiveVideoAddress).mockResolvedValue({ result: 0 })
    vi.mocked(api.getUpstreamSession).mockResolvedValue({ result: 0 })
    await run(playHlsStream('DEV1', 1, 'v1', '51A'))
    expect(loader.textContent).toBe('Stream Not Available')
    expect(status.textContent).toBe('ERROR')
  })
})
