import { usePlaybackStore, type FileListView } from '../store'
import { onFilePlayClick } from '../videoController'
import { ChannelTabs } from './ChannelTabs'
import { CARD_TITLE_SPAN, EMPTY_STATE } from './classes'
import { PlayerArea } from './PlayerArea'

// LEFT: Video Player + File List (index.html:997-1027) — styles2.css:2911-3128, 3584-3606.

function FileListBody({ view }: { view: FileListView }) {
  switch (view.kind) {
    case 'initial':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-folder-open fa-2x" style={{ opacity: 0.3 }} aria-hidden="true"></i>
          <p>Danh sách video sẽ hiển thị sau khi tìm kiếm</p>
        </div>
      )
    case 'loading':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ opacity: 0.4 }} aria-hidden="true"></i>
          <p>Đang tải danh sách video...</p>
        </div>
      )
    case 'empty':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-folder-open fa-2x" style={{ opacity: 0.3 }} aria-hidden="true"></i>
          <p>Không tìm thấy video trong khoảng thời gian này</p>
        </div>
      )
    case 'error':
      return (
        <div className={EMPTY_STATE}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }} aria-hidden="true"></i>
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
                      <i className="fa-solid fa-play" aria-hidden="true"></i> Phát
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

export function VideoPanel() {
  const plate = usePlaybackStore((s) => s.playerPlate)
  const time = usePlaybackStore((s) => s.playerTime)
  const fileList = usePlaybackStore((s) => s.fileList)
  const fileListCount = usePlaybackStore((s) => s.fileListCount)
  const fileListVisible = usePlaybackStore((s) => s.fileListVisible)

  return (
    <div className="pb-video-col flex flex-col overflow-hidden rounded-[14px] border border-solid border-[rgba(15,23,42,0.12)] bg-[#0b1220] shadow-[0_10px_24px_rgba(15,23,42,0.08)] max-[1280px]:border-b-[rgba(226,232,240,0.85)]">
      <div
        className="pb-player-card relative flex min-h-0 flex-1 flex-col max-[1280px]:h-[450px] max-[1280px]:flex-none"
        id="pb-player-card"
      >
        <div className="pb-player-header relative z-[2] flex items-center justify-between border-b border-solid border-white/[0.06] bg-linear-to-b from-[rgba(2,6,23,0.92)] to-[rgba(2,6,23,0.72)] px-5 py-3">
          <div className="pb-player-info flex flex-col gap-[0.1rem]">
            <span
              className="pb-player-plate text-base font-bold tracking-[0.05em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]"
              id="pb-player-plate"
            >
              {plate}
            </span>
            <span className="pb-player-time text-[0.74rem] text-white/70" id="pb-player-time">
              {time}
            </span>
          </div>
        </div>
        <PlayerArea />
        <ChannelTabs />
      </div>

      <div
        className="pb-filelist-card flex h-[250px] flex-col border-t border-solid border-[rgba(226,232,240,0.85)] bg-white max-[1280px]:h-[200px] min-[1025px]:max-[1919px]:h-[230px]"
        id="pb-filelist-card"
        style={fileListVisible ? undefined : { display: 'none' }}
      >
        <div className="pb-filelist-header flex items-center justify-between border-b border-solid border-[rgba(226,232,240,0.9)] bg-[#f8fafc] px-5 py-3">
          <span className={CARD_TITLE_SPAN}>
            <i className="fa-solid fa-list-ul" style={{ color: '#3b82f6' }} aria-hidden="true"></i> Danh sách file video
          </span>
          {/* `.pb-filelist-header span` (0,1,1) thắng `.pb-filelist-count` về cỡ chữ/màu như bản gốc */}
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
