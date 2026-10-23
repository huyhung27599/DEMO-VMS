import { CAMERA_FILTER_OPTIONS } from '../mockData'
import { usePlaybackStore, type FileListView } from '../store'
import { onFilePlayClick } from '../videoController'
import { ChannelTabs } from './ChannelTabs'
import { CARD_TITLE_SPAN, EMPTY_STATE } from './classes'
import { PlaybackChrome } from './PlaybackChrome'
import { PlayerArea } from './PlayerArea'

function FileListBody({ view }: { view: FileListView }) {
  switch (view.kind) {
    case 'initial':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-folder-open fa-2x" style={{ opacity: 0.3 }} aria-hidden />
          <p>Danh sách video sẽ hiển thị sau khi tìm kiếm</p>
        </div>
      )
    case 'loading':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ opacity: 0.4 }} aria-hidden />
          <p>Đang tải danh sách video...</p>
        </div>
      )
    case 'empty':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-folder-open fa-2x" style={{ opacity: 0.3 }} aria-hidden />
          <p>Không tìm thấy video trong khoảng thời gian này</p>
        </div>
      )
    case 'error':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }} aria-hidden />
          <p>Lỗi tải danh sách: {view.message}</p>
        </div>
      )
    case 'table':
      return (
        <table className="pb-filelist-table w-full border-collapse">
          <thead>
            <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:border-b [&>th]:border-solid [&>th]:border-border [&>th]:bg-[#f1f5f9] [&>th]:px-4 [&>th]:py-[0.6rem] [&>th]:text-left [&>th]:text-[0.72rem] [&>th]:font-bold [&>th]:tracking-[0.05em] [&>th]:text-text-muted [&>th]:uppercase">
              <th>Kênh</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Loại</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {view.files.map((f, i) => {
              const begin = f._beginNorm || '--'
              const end = f._endNorm || '--'
              const chn = f._channel || '--'
              return (
                <tr
                  key={i}
                  className="[&>td]:border-b [&>td]:border-solid [&>td]:border-[#f1f5f9] [&>td]:px-4 [&>td]:py-[0.6rem] [&>td]:text-[0.82rem] hover:[&>td]:bg-primary/[0.04]"
                >
                  <td>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>K{chn}</span>
                  </td>
                  <td>{begin.length > 16 ? begin.slice(11, 19) : begin}</td>
                  <td>{end.length > 16 ? end.slice(11, 19) : end}</td>
                  <td>{String(f.fileType || f.type || 'Video')}</td>
                  <td>
                    <button
                      type="button"
                      className="pb-file-play-btn cursor-pointer rounded-sm border-none bg-primary/10 px-3 py-[0.35rem] text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-primary"
                      data-idx={i}
                      onClick={() => onFilePlayClick(i)}
                    >
                      <i className="fa-solid fa-play" aria-hidden /> Phát
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )
  }
}

function cameraLabel(filter: string): string {
  return CAMERA_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'Camera lái xe'
}

export function VideoPanel() {
  const plate = usePlaybackStore((s) => s.playerPlate)
  const time = usePlaybackStore((s) => s.playerTime)
  const fileList = usePlaybackStore((s) => s.fileList)
  const fileListCount = usePlaybackStore((s) => s.fileListCount)
  const fileListVisible = usePlaybackStore((s) => s.fileListVisible)
  const cameraFilter = usePlaybackStore((s) => s.cameraFilter)
  const channelTabs = usePlaybackStore((s) => s.channelTabs)
  const player = usePlaybackStore((s) => s.player)

  const activeCam =
    channelTabs?.active != null
      ? `Kênh ${channelTabs.active}`
      : cameraFilter === '0'
        ? 'Camera lái xe'
        : cameraLabel(cameraFilter)

  const showMeta = player.kind !== 'initial'

  return (
    <div className="pb-video-col flex flex-col gap-3 overflow-hidden">
      <div
        className="pb-player-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm max-[1280px]:h-[480px] max-[1280px]:flex-none"
        id="pb-player-card"
      >
        {showMeta ? (
          <div className="pb-player-header relative z-[2] flex items-center justify-between border-b border-[#eef2f6] bg-[#f8fafc] px-5 py-2.5">
            <div className="pb-player-info flex flex-col gap-[0.1rem]">
              <span
                className="pb-player-plate text-[0.95rem] font-bold tracking-[0.04em] text-[#0f172a]"
                id="pb-player-plate"
              >
                {plate}
              </span>
              <span className="pb-player-time text-[0.72rem] text-[#94a3b8]" id="pb-player-time">
                {time}
              </span>
            </div>
            <span className="rounded-lg bg-[#f1f5f9] px-2.5 py-1 text-[0.72rem] font-semibold text-[#64748b]">
              {activeCam}
            </span>
          </div>
        ) : (
          <>
            <span id="pb-player-plate" className="sr-only">
              {plate}
            </span>
            <span id="pb-player-time" className="sr-only">
              {time}
            </span>
          </>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-none bg-[#0f172a]">
          <PlayerArea />
          <ChannelTabs />
        </div>

        <PlaybackChrome />
      </div>

      <div
        className="pb-filelist-card flex h-[200px] flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm max-[1280px]:h-[180px]"
        id="pb-filelist-card"
        style={fileListVisible ? undefined : { display: 'none' }}
      >
        <div className="pb-filelist-header flex items-center justify-between border-b border-[#eef2f6] bg-[#f8fafc] px-5 py-3">
          <span className={CARD_TITLE_SPAN}>
            <i className="fa-solid fa-list-ul" style={{ color: '#3b82f6' }} aria-hidden /> Danh sách file video
          </span>
          <span
            className={`pb-filelist-count rounded-full bg-primary/10 px-[0.6rem] py-[0.15rem] ${CARD_TITLE_SPAN}`}
            id="pb-filelist-count"
          >
            {fileListCount}
          </span>
        </div>
        <div className="pb-filelist-body flex-1 overflow-y-auto" id="pb-filelist-body">
          <FileListBody view={fileList} />
        </div>
      </div>
    </div>
  )
}
