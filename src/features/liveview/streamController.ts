import Hls from 'hls.js'
import { api } from '../../shared/api/endpoints'
import { extractUrlFromLiveHtmlResponse, KEEPALIVE_INTERVAL_MS, type Loose } from './lib'
import { stopDriverInfoTimers } from './task11Hooks'

// Phần luồng video của window.LiveViewModule (liveview.js:3-6, 73-171, 1710-1852).
// Trạng thái giữ ở biến module như bản gốc.

let keepaliveTimer: ReturnType<typeof setInterval> | null = null
let activeDeviceId: string | null = null
let activeIframe: HTMLIFrameElement | null = null
let failedAttempts = 0

/** liveview.js:73-102 */
export function startKeepalive(deviceId: string, iframe: HTMLIFrameElement): void {
  stopKeepalive()
  activeDeviceId = deviceId
  activeIframe = iframe

  keepaliveTimer = setInterval(async () => {
    if (!activeDeviceId) return
    try {
      const res: Loose = await api.realTimeVideo(activeDeviceId, 0, 1, 1, 300)

      if (res && res.result === 0) {
        failedAttempts = 0
        console.log(`[LiveView] Heartbeat OK - ${new Date().toLocaleTimeString()}`)
      } else {
        throw new Error(res?.msg || 'Keepalive response error')
      }
    } catch (e) {
      failedAttempts++
      console.warn(`[LiveView] Heartbeat failed (${failedAttempts}/2):`, e)

      if (failedAttempts >= 2) {
        console.error('[LiveView] Persistent heartbeat failure. Recovering stream...')
        reloadActiveIframe()
        failedAttempts = 0
      }
    }
  }, KEEPALIVE_INTERVAL_MS)

  console.log('[LiveView] Keepalive started for device:', deviceId)
}

/** liveview.js:104-126 */
export function stopKeepalive(): void {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer)
    keepaliveTimer = null
  }
  activeDeviceId = null
  activeIframe = null
  // Also clear any driver presence polling (+ face check, driving duration, sessions) — Task 11
  stopDriverInfoTimers()
}

/** liveview.js:156-164 */
export function reloadActiveIframe(): void {
  if (activeIframe && activeIframe.src) {
    const src = activeIframe.src
    activeIframe.src = ''
    setTimeout(() => {
      if (activeIframe) activeIframe.src = src
    }, 500)
  }
}

/** liveview.js:166-171 — listener gắn một lần lúc nạp module (bản gốc: lúc nạp script). */
function onVisibilityChange(): void {
  if (document.visibilityState === 'visible' && activeIframe) {
    console.log('[LiveView] Tab visible again, refreshing stream...')
    reloadActiveIframe()
  }
}
document.addEventListener('visibilitychange', onVisibilityChange)

/** liveview.js:1710-1726 */
export async function resolveUnifiedPlayerUrl({
  deviceId,
  plateNum,
  upstreamJsession,
}: {
  deviceId: string
  plateNum: string
  upstreamJsession: string
}): Promise<string> {
  // Ưu tiên API chính thức theo tài liệu: sec-video-live-html
  try {
    const liveHtmlRes = await api.getLiveVideoHtml(deviceId, 0, 'en')
    const apiUrl = extractUrlFromLiveHtmlResponse(liveHtmlRes)

    // Only return if it's a valid external URL (extractUrlFromLiveHtmlResponse now handles this validation)
    if (apiUrl && apiUrl.startsWith('http') && !apiUrl.includes(window.location.host)) {
      return apiUrl
    }
  } catch (e) {
    console.warn('[LiveView] getLiveVideoHtml failed, falling back to RealPlay URL', e)
  }

  // Fallback về URL player cũ khi API live-html không trả về link trực tiếp hoặc trả về link không hợp lệ
  return `https://fleetscontrol.com/808gps/open/player/RealPlayVideo.html?jsession=${encodeURIComponent(upstreamJsession)}&PlateNum=${encodeURIComponent(plateNum)}&channel=0&showChnList=false&close=0&closeMins=0&lang=en`
}

/**
 * Phần mạng của renderUnifiedPlayer (liveview.js:1167-1196): lấy phiên upstream, dựng iframe player
 * (tạo bằng document.createElement như bản gốc), rồi bắt đầu keepalive cho iframe đó.
 * Trả iframe (chưa gắn vào DOM) hoặc null khi lỗi ("Stream Not Available").
 * `onIframe` được gọi trước startKeepalive (bản gốc: gắn iframe vào tile rồi mới keepalive).
 */
export async function createUnifiedPlayerIframe(
  { deviceId, vehicleName, vehiIdno }: { deviceId: string; vehicleName: string; vehiIdno: string },
  onIframe: (iframe: HTMLIFrameElement) => void,
): Promise<HTMLIFrameElement | null> {
  try {
    const s: Loose = await api.getUpstreamSession()
    const upstreamJsession = s?.upstreamJsession
    if (!upstreamJsession) throw new Error('Missing upstream session')

    const plateNum = (vehiIdno || vehicleName || '').toString().trim()
    const iframe = document.createElement('iframe')
    iframe.src = await resolveUnifiedPlayerUrl({
      deviceId,
      plateNum,
      upstreamJsession,
    })
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = '0'
    iframe.style.background = '#000'
    iframe.allow = 'autoplay; fullscreen'
    iframe.referrerPolicy = 'no-referrer-when-downgrade'

    onIframe(iframe)

    // Bắt đầu keepalive cho iframe này
    startKeepalive(deviceId, iframe)
    return iframe
  } catch (e) {
    console.error('Unified player failed:', e)
    return null
  }
}

/**
 * liveview.js:1728-1852 — bản gốc KHÔNG gọi hàm này ở đâu (code chết, renderUnifiedPlayer dùng iframe).
 * Giữ nguyên chữ ký gốc: tìm `#videoId`, `#videoId-loader`, `#videoId-status` trong document.
 * Instance Hls không bao giờ bị destroy (bản gốc khai báo `_activeHlsPlayers` nhưng không dùng).
 */
export async function playHlsStream(
  deviceId: string,
  channel: number | string,
  videoId: string,
  vehicleName: string,
): Promise<void> {
  const video = document.getElementById(videoId) as HTMLVideoElement | null
  const loader = document.getElementById(`${videoId}-loader`)
  const statusSpan = document.getElementById(`${videoId}-status`)
  if (!video) return

  try {
    // Many fleetscontrol devices require starting realtime stream before fetching HLS address.
    // Start sub stream (streamType=1) and keep it open for a short duration.
    try {
      await api.realTimeVideo(deviceId, channel, 1, 1, 300)
      await new Promise((r) => setTimeout(r, 400))
    } catch (e) {
      // If upstream doesn't require this step, ignore and continue.
      console.warn('Could not start realtime video (continuing):', e)
    }

    // 1 for sub stream (usually sufficient for 4-channel view)
    const res: Loose = await api.getLiveVideoAddress(deviceId, channel, 1)

    let streamUrl = ''
    if (res && res.result === 0) {
      if (res.url && typeof res.url === 'string') streamUrl = res.url
      else if (res.file && typeof res.file === 'string') streamUrl = res.file
      else if (res.address && typeof res.address === 'string') streamUrl = res.address
      else if (typeof res === 'string' && (res as string).includes('.m3u8')) streamUrl = res
    }

    if (!streamUrl) {
      throw new Error('No live stream URL returned')
    }

    // Prevent mixed-content when the app is served over https
    if (window.location.protocol === 'https:' && streamUrl.startsWith('http://')) {
      throw new Error('Mixed content blocked (https page → http stream). Use https stream or serve app over http.')
    }

    if (loader) loader.style.display = 'none'
    if (statusSpan) {
      statusSpan.textContent = 'ONLINE'
      statusSpan.style.color = 'var(--color-primary)'
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
      })
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        video.play().catch((e) => console.warn('Auto-play prevented', e))
      })
      hls.on(Hls.Events.ERROR, function (_event, data) {
        if (data.fatal) {
          console.error('HLS fatal error for CH' + channel, data)
          if (statusSpan) {
            statusSpan.textContent = 'ERROR'
            statusSpan.style.color = 'var(--color-danger)'
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = streamUrl
      video.addEventListener('loadedmetadata', function () {
        video.play().catch((e) => console.warn('Auto-play prevented', e))
      })
      video.addEventListener('error', function () {
        if (statusSpan) {
          statusSpan.textContent = 'ERROR'
          statusSpan.style.color = 'var(--color-danger)'
        }
      })
    } else {
      if (loader) {
        loader.style.display = 'block'
        loader.textContent = 'Browser does not support HLS'
      }
    }
  } catch (error) {
    console.error(`Error playing stream for ${deviceId} CH${channel}:`, error)

    // Fallback: embed fleetscontrol H5 player (works even when HLS address API is not available).
    try {
      const s: Loose = await api.getUpstreamSession()
      const upstreamJsession = s?.upstreamJsession
      if (!upstreamJsession) throw new Error('Missing upstream session', { cause: error })

      const plateNum = (vehicleName || '').toString().trim()
      const previewChn = Math.max(0, (parseInt(String(channel), 10) || 1) - 1)

      // Replace only the media element to keep overlay/status nodes intact
      const container = video.closest('.video-tile') || video.parentElement
      if (container) {
        const iframe = document.createElement('iframe')
        iframe.src = `https://fleetscontrol.com/808gps/open/player/RealPlayVideo.html?jsession=${encodeURIComponent(upstreamJsession)}&PlateNum=${encodeURIComponent(plateNum)}&previewChn=${encodeURIComponent(previewChn)}&showChnList=false&lang=en`
        iframe.style.width = '100%'
        iframe.style.height = '100%'
        iframe.style.border = '0'
        iframe.style.background = '#000'
        iframe.allow = 'autoplay; fullscreen'
        iframe.referrerPolicy = 'no-referrer-when-downgrade'
        video.replaceWith(iframe)
      }

      if (loader) loader.style.display = 'none'
      if (statusSpan) {
        statusSpan.textContent = 'PLAYER'
        statusSpan.style.color = 'var(--color-warning, #f59e0b)'
      }
      return
    } catch (fallbackErr) {
      console.error('Fallback player failed:', fallbackErr)
    }

    if (loader) {
      loader.style.display = 'block'
      loader.textContent = 'Stream Not Available'
    }
    if (statusSpan) {
      statusSpan.textContent = 'ERROR'
      statusSpan.style.color = 'var(--color-danger)'
    }
  }
}

export const streamController = {
  startKeepalive,
  stopKeepalive,
  reloadActiveIframe,
  resolveUnifiedPlayerUrl,
  createUnifiedPlayerIframe,
  playHlsStream,
}

/** Chỉ dùng trong test: trạng thái keepalive hiện tại. */
export function getKeepaliveState(): { deviceId: string | null; iframe: HTMLIFrameElement | null; running: boolean } {
  return { deviceId: activeDeviceId, iframe: activeIframe, running: keepaliveTimer !== null }
}

/** Chỉ dùng trong test. */
export function resetStreamController(): void {
  if (keepaliveTimer) clearInterval(keepaliveTimer)
  keepaliveTimer = null
  activeDeviceId = null
  activeIframe = null
  failedAttempts = 0
}
