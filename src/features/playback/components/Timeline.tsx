import type { ReactNode } from 'react'
import { formatDurationSec, formatTrackDateTime, MOVING_SPEED_KMH, type JournalEntry } from '../lib'
import { usePlaybackStore } from '../store'
import { onTimelineItemClick } from '../track'
import { EMPTY_STATE } from './classes'

// Nội dung #pb-timeline-body (renderTimeline / renderTimelineEmpty — playback.js:1659-1740;
// styles2.css:3486-3569). Bản gốc dựng innerHTML; title/địa chỉ đã escapeHtml → JSX (R13).

const DOT: Record<string, string> = {
  start: 'bg-[#10b981]',
  end: 'bg-[#ef4444]',
  parked: 'bg-[#eab308]',
}

function TimelineItem({
  entry,
  ei,
  entries,
  place,
  active,
}: {
  entry: JournalEntry
  ei: number
  entries: JournalEntry[]
  place: string | undefined
  active: boolean
}) {
  const { type, p } = entry
  let dotCls = 'parked'
  let title = ''
  let timeHtml: string = formatTrackDateTime(p.time)
  let detailsHtml: ReactNode = ''

  if (type === 'start') {
    dotCls = 'start'
    title = 'Bắt đầu hành trình'
    detailsHtml = 'Xe bắt đầu ghi nhận GPS trong khoảng thời gian tìm kiếm.'
  } else if (type === 'end') {
    dotCls = 'end'
    title = 'Kết thúc hành trình'
    detailsHtml = 'Điểm GPS cuối cùng trong khoảng thời gian tìm kiếm.'
  } else if (type === 'park') {
    dotCls = 'parked'
    title = `Đỗ xe · ${formatDurationSec(p.durationSec)}`
    timeHtml = `${formatTrackDateTime(p.time)} → ${formatTrackDateTime(p.parkEnd)}`
    detailsHtml = (
      <>
        Xe dừng tại địa điểm ≥ <strong>30 phút</strong> (tốc độ ≤ {MOVING_SPEED_KMH} km/h).
      </>
    )
  }

  const gmaps = `https://www.google.com/maps?q=${encodeURIComponent(`${p.lat},${p.lng}`)}`
  const placeText = place ?? (p.addr ? `Địa điểm: ${p.addr}` : 'Địa điểm: đang tra cứu…')
  const parkAttr = type === 'park' ? entries.slice(0, ei).filter((e) => e.type === 'park').length : undefined

  return (
    <div
      className={`pb-timeline-item flex cursor-pointer items-start gap-3 border-b border-solid border-[#f1f5f9] px-5 py-[0.6rem] transition-all duration-200 hover:bg-[rgba(59,130,246,0.04)] focus-visible:outline-2 focus-visible:outline-primary ${
        active ? 'active-point border-l-[3px] border-l-primary bg-[rgba(42,157,216,0.06)]' : ''
      }`}
      data-entry-i={ei}
      data-type={type}
      data-idx={entry.idx}
      data-park-i={parkAttr}
      role="button"
      tabIndex={0}
      onClick={() => onTimelineItemClick(entries, ei)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onTimelineItemClick(entries, ei)
        }
      }}
    >
      <div
        className={`pb-tl-dot ${dotCls} mt-1 size-[10px] shrink-0 rounded-full border-2 border-solid border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] ${DOT[dotCls]}`}
      ></div>
      <div className="pb-tl-info">
        <div className="pb-tl-title mb-[0.1rem] text-[0.8rem] font-bold text-text-main">{title}</div>
        <div className="pb-tl-time text-[0.78rem] font-bold text-text-main">{timeHtml}</div>
        <div className="pb-tl-details mt-[0.15rem] text-[0.72rem] text-text-muted">
          {detailsHtml} Tọa độ {p.lat.toFixed(5)}°, {p.lng.toFixed(5)}° ·{' '}
          <a
            href={gmaps}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary no-underline hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Mở Google Maps
          </a>
        </div>
        <div className="pb-tl-place mt-[0.28rem] text-[0.72rem] leading-[1.4] text-text-muted">{placeText}</div>
      </div>
    </div>
  )
}

export function Timeline() {
  const timeline = usePlaybackStore((s) => s.timeline)
  if (timeline.kind === 'entries') {
    return (
      <>
        {timeline.entries.map((entry, ei) => (
          <TimelineItem
            key={ei}
            entry={entry}
            ei={ei}
            entries={timeline.entries}
            place={timeline.places[ei]}
            active={timeline.active === ei}
          />
        ))}
      </>
    )
  }
  return (
    <div className={EMPTY_STATE}>
      <i className="fa-solid fa-location-dot fa-2x" style={{ opacity: 0.3 }} aria-hidden="true"></i>
      <p>{timeline.kind === 'empty' ? 'Không có dữ liệu GPS' : 'Lịch sử GPS hiển thị sau khi tìm kiếm'}</p>
    </div>
  )
}
