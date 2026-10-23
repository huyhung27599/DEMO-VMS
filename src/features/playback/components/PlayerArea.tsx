import { useEffect, useRef, useState, type HTMLAttributeReferrerPolicy, type ReactNode } from 'react'
import { Button } from '../../../shared/ui/Button'
import { usePlaybackStore, type PlayerView } from '../store'
import { attachVideoSource, onVideoError } from '../videoController'

// #pb-player-area (index.html:1005-1010) — nội dung do injectIframe / injectVideo / các placeholder của
// playback.js gán bằng innerHTML. styles2.css:3006-3033 (+ responsive-desktop.css:217-219).
// Chuỗi động (thông báo lỗi, devId...) được JSX escape (R13).

const PLACEHOLDER =
  'pb-player-placeholder flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,#1e293b,#0f172a)] text-white/30'

type PlayerVideoView = Extract<PlayerView, { kind: 'video' }>

/** view đã gắn nguồn (StrictMode chạy effect hai lần trên cùng thẻ video: chỉ tạo một Hls) */
const attached = new WeakSet<PlayerVideoView>()

function Placeholder({ children }: { children: ReactNode }) {
  return <div className={PLACEHOLDER}>{children}</div>
}

function Spinner({ text }: { text: string }) {
  return (
    <Placeholder>
      <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ opacity: 0.5 }} aria-hidden="true"></i>
      <p>{text}</p>
    </Placeholder>
  )
}

function ErrorIcon({ color = '#ef4444', icon = 'fa-circle-exclamation' }: { color?: string; icon?: string }) {
  return <i className={`fa-solid ${icon} fa-2x`} style={{ color }} aria-hidden="true"></i>
}

/** nút "Thử lại" (onclick="window.location.reload()") */
function ReloadButton() {
  return (
    <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
      Thử lại
    </Button>
  )
}

/** injectVideo (playback.js:243-304): wrapper + banner H.265 + <video>. Hls không bị destroy khi gỡ (như bản gốc). */
function PlayerVideo({ view }: { view: PlayerVideoView }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [showBanner, setShowBanner] = useState(view.codecWarning === 'h265')

  useEffect(() => {
    const v = ref.current
    if (!v || attached.has(view)) return
    attached.add(view)
    attachVideoSource(v, view.url, view.onFailure)
  }, [view])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {showBanner ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'rgba(245,158,11,0.92)',
            color: '#fff',
            fontSize: '0.8rem',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backdropFilter: 'blur(4px)',
          }}
        >
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <span>
            Video dùng codec <b>H.265 (HEVC)</b> — Chrome/Firefox có thể không phát được. Thử dùng{' '}
            <b>Safari hoặc Edge</b>.
          </span>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setShowBanner(false)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      ) : null}
      <video
        ref={ref}
        controls
        autoPlay
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%', background: '#000' }}
        onError={(e) => onVideoError(e.currentTarget, view.url, view.onFailure)}
      />
    </div>
  )
}

function PlayerContent({ view }: { view: PlayerView }) {
  switch (view.kind) {
    case 'initial':
      return (
        <div className={PLACEHOLDER} id="pb-player-placeholder">
          <button
            type="button"
            className="flex size-16 cursor-default items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            aria-label="Chờ phát"
          >
            <i className="fa-solid fa-play ml-1 text-2xl" aria-hidden="true"></i>
          </button>
          <p className="max-w-[280px] text-center text-[0.85rem] text-white/45">
            Chọn phương tiện và khoảng thời gian
            <br />
            rồi nhấn <strong className="text-white/70">Tìm kiếm</strong>
          </p>
        </div>
      )
    case 'loading':
      return <Spinner text={view.text} />
    case 'iframe':
      return (
        <iframe
          key={view.id}
          title="Trình phát video"
          src={view.src}
          style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
          allow="autoplay; fullscreen"
          referrerPolicy={view.referrer as HTMLAttributeReferrerPolicy | undefined}
        />
      )
    case 'video':
      return <PlayerVideo key={view.id} view={view} />
    case 'mediaError':
      return (
        <Placeholder>
          <ErrorIcon />
          <p>{view.hint}</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Chi tiết: MEDIA_ERR code={view.errCode}</p>
          <ReloadButton />
        </Placeholder>
      )
    case 'unifiedError':
      return (
        <Placeholder>
          <ErrorIcon />
          <p style={{ fontWeight: 600 }}>Không thể tải trình phát video</p>
          <p style={{ fontSize: '0.82rem', opacity: 0.75, maxWidth: 320, margin: '0 auto' }}>{view.message}</p>
        </Placeholder>
      )
    case 'probeError':
      return (
        <Placeholder>
          <ErrorIcon />
          <p style={{ fontWeight: 600 }}>{view.title}</p>
          <p style={{ fontSize: '0.82rem', opacity: 0.75, maxWidth: 320, margin: '0 auto' }}>{view.detail}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <ReloadButton />
          </div>
        </Placeholder>
      )
    case 'playError':
      return (
        <Placeholder>
          <ErrorIcon />
          <p>Không thể phát video này.</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>
            MEDIA_ERR code={String(view.code)} — Kiểm tra Console để biết thêm.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ReloadButton />
            <a
              href={view.pUrl}
              target="_blank"
              className="rounded-md px-[0.65rem] py-[0.3rem] text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}
            >
              Xem luồng gốc
            </a>
          </div>
        </Placeholder>
      )
    case 'unsupported':
      return (
        <Placeholder>
          <ErrorIcon color="#f59e0b" icon="fa-triangle-exclamation" />
          <p>Không mở được trình phát phát lại.</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            Đã thử API phát lại và iframe fleetscontrol. Kiểm tra phiên đăng nhập hoặc quyền thiết bị.
            <br />
            <span style={{ opacity: 0.6 }}>
              devId: {view.devId || '?'} | ch: {view.channel} | {view.begin}
            </span>
          </p>
        </Placeholder>
      )
  }
}

export function PlayerArea() {
  const view = usePlaybackStore((s) => s.player)
  return (
    <div
      className="pb-player-area relative h-full min-h-[420px] w-full flex-1 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_70%_10%,rgba(16,185,129,0.10),transparent_60%),#000] min-[1025px]:max-[1919px]:min-h-[386px]"
      id="pb-player-area"
    >
      <PlayerContent view={view} />
    </div>
  )
}
