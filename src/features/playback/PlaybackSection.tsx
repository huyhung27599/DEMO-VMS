import { useEffect } from 'react'
import { onNavItemClick, onSectionShown } from '../../app/useActiveSection'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { RightPanel } from './components/RightPanel'
import { HiddenTimeRange, SearchForm } from './components/SearchForm'
import { VideoPanel } from './components/VideoPanel'
import { usePlaybackStore } from './store'
import { handleResize } from './videoController'
import './playback.css'

// #playback-section (index.html:958-1091) — styles2.css:2785-2796 (+ responsive-desktop.css:209-211).

/**
 * main.js:164-166 — switchSection('playback'): trong setTimeout 150 ms (onSectionShown) hẹn thêm
 * handleResize sau 300 và 800 ms (tức 450 / 950 ms kể từ lúc đổi route, như bản gốc lồng hai setTimeout).
 */
function onPlaybackSectionShown(): void {
  setTimeout(handleResize, 300)
  setTimeout(handleResize, 800)
}

/** playback.js:1957-1959 — mọi click `.nav-item[data-target="playback"]` (kể cả route đang active): +220 ms. */
function onPlaybackNavClick(): void {
  setTimeout(handleResize, 220)
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
    <ContentSection id="playback" hidden={hidden} overflow="hidden" className="gap-0 bg-bg p-0!">
      <SectionHeader
        title="Phát lại video & hành trình"
        subtitle="Xem lại lịch sử di chuyển và video hành trình"
        className="px-8 pt-6 min-[1025px]:max-[1919px]:px-[1.65rem] min-[1025px]:max-[1919px]:pt-5 min-[1025px]:max-[1919px]:pb-[0.85rem]"
      >
        <SearchForm />
      </SectionHeader>

      <HiddenTimeRange />

      {/* Minimal status row */}
      <div className="pb-secondary-filters z-[5] shrink-0 border-b border-solid border-border bg-white px-6 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-[768px]:px-4 min-[1025px]:max-[1919px]:px-5">
        <div className="pb-filter-row flex flex-wrap items-center gap-4">
          <div
            className={`pb-status-info ml-auto flex items-center gap-[0.4rem] rounded-full border border-solid px-3 py-[0.3rem] text-[0.78rem] font-semibold transition-all duration-300 max-[768px]:ml-0 max-[768px]:w-full ${
              trackStatus.active
                ? 'active border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.08)] text-[#059669] [&_i]:text-[#059669]'
                : 'border-border bg-[#f8fafc] text-text-muted [&_i]:text-primary'
            }`}
            id="pb-track-status-header"
          >
            <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span id="pb-track-status">{trackStatus.text}</span>
          </div>
        </div>
      </div>

      {/* Main Playback Layout */}
      <PlaybackLayout />
    </ContentSection>
  )
}

function PlaybackLayout() {
  const collapsed = usePlaybackStore((s) => s.rightCollapsed)
  return (
    <div
      className={`pb-main-layout grid min-h-0 flex-1 gap-4 overflow-hidden p-4 max-[1280px]:grid-cols-1 max-[1280px]:grid-rows-[1fr_auto] max-[1280px]:overflow-y-auto max-[1280px]:p-3 ${
        collapsed ? 'pb-right-collapsed grid-cols-[1fr_0]' : 'grid-cols-[1fr_400px]'
      }`}
    >
      <VideoPanel />
      <RightPanel />
    </div>
  )
}
