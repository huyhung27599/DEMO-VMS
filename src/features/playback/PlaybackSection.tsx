import { useEffect } from 'react'
import { onNavItemClick, onSectionShown } from '../../app/useActiveSection'
import { showToast } from '../../shared/ui/toastStore'
import { ContentSection } from '../../shared/ui/Section'
import { RightPanel } from './components/RightPanel'
import { HiddenTimeRange, SearchForm } from './components/SearchForm'
import { VideoPanel } from './components/VideoPanel'
import { usePlaybackStore } from './store'
import { handleResize } from './videoController'
import './playback.css'

function onPlaybackSectionShown(): void {
  setTimeout(handleResize, 300)
  setTimeout(handleResize, 800)
}

function onPlaybackNavClick(): void {
  setTimeout(handleResize, 220)
}

function onDownloadClick(): void {
  const files = usePlaybackStore.getState().recdFiles
  const url = files.find((f) => f._downUrl)?._downUrl
  if (url) {
    window.open(String(url), '_blank', 'noopener,noreferrer')
    return
  }
  showToast('Chưa có file để tải. Hãy tìm kiếm video trước.', 'warning')
}

export function PlaybackSection({ hidden }: { hidden: boolean }) {
  const trackStatus = usePlaybackStore((s) => s.trackStatus)

  useEffect(() => {
    const offShown = onSectionShown('playback', onPlaybackSectionShown)
    const offClick = onNavItemClick('playback', onPlaybackNavClick)
    return () => {
      offShown()
      offClick()
    }
  }, [])

  return (
    <ContentSection id="playback" hidden={hidden} overflow="hidden" className="gap-0 bg-[#f8fafc] p-0!">
      <header className="flex shrink-0 items-start justify-between gap-4 px-8 pt-6 pb-4 max-[768px]:flex-col max-[768px]:px-4">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Phát lại video</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">Xem lại video, hành trình và sự kiện đã ghi</p>
        </div>
        <button
          type="button"
          onClick={onDownloadClick}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#334155] shadow-sm transition hover:border-[#c92038]/30 hover:text-[#c92038]"
        >
          <i className="fa-solid fa-download" aria-hidden /> Tải video
        </button>
      </header>

      <div className="shrink-0 px-8 pb-3 max-[768px]:px-4">
        <SearchForm />
      </div>

      <HiddenTimeRange />

      <div className="pb-secondary-filters sr-only z-[5] shrink-0" aria-live="polite">
        <div
          className={`pb-status-info ${trackStatus.active ? 'active' : ''}`}
          id="pb-track-status-header"
        >
          <span id="pb-track-status">{trackStatus.text}</span>
        </div>
      </div>

      <PlaybackLayout />
    </ContentSection>
  )
}

function PlaybackLayout() {
  const collapsed = usePlaybackStore((s) => s.rightCollapsed)
  return (
    <div
      className={`pb-main-layout grid min-h-0 flex-1 gap-4 overflow-hidden px-8 pb-6 max-[1280px]:grid-cols-1 max-[1280px]:grid-rows-[1fr_auto] max-[1280px]:overflow-y-auto max-[768px]:px-4 ${
        collapsed ? 'pb-right-collapsed grid-cols-[1fr_0]' : 'grid-cols-[1fr_320px]'
      }`}
    >
      <VideoPanel />
      <RightPanel />
    </div>
  )
}
