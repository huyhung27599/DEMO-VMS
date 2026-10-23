import { useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../shared/api/endpoints'
import { Button } from '../../../shared/ui/Button'
import {
  aiEventsQueryOptions,
  onAiSearchInput,
  onRefreshAiEventsClick,
  openAiEventModal,
  useAiEventsStore,
  type AiEventsListView,
  type AiThumbView,
} from '../aiQueries'
import type { Loose } from '../lib'
import { getDriverMapping } from '../queries'
import { useLiveviewStore } from '../store'
import { AiEventModal } from './AiEventModal'

// index.html:934-953 — tab "Sự kiện AI" (#rtab-ai-events) + liveview.js:638-784 renderAiEvents
// + styles2.css:1334-1527 (.ai-events-*, .ai-event-card, .ai-card-*), responsive-desktop.css:158-160.

const EMPTY_LI = 'ai-event-empty px-8 py-16 text-center text-text-muted'

// Nghiêm trọng (Đỏ): Mệt mỏi, Ngáp, Điện thoại, Hút thuốc, Mất tập trung
const CRITICAL_CODES = [
  ...['600', '618', '620', '643'], // Mệt mỏi
  ...['601', '619', '621'], // Ngáp
  ...['602', '622', '631'], // Điện thoại
  ...['603', '623'], // Hút thuốc
  ...['604', '624'], // Mất tập trung
]

const IMG_FILL: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' }

function SlashIcon() {
  return <i className="fa-solid fa-image-slash" style={{ color: '#475569', fontSize: '1.3rem' }} aria-hidden="true"></i>
}

function ViewfinderIcon() {
  return (
    <i className="fa-solid fa-face-viewfinder" style={{ color: '#8b5cf6', fontSize: '1.6rem' }} aria-hidden="true"></i>
  )
}

/** <img onerror="this.parentElement.innerHTML='<icon>'">: lỗi tải thì thay bằng `fallback`. */
function ImgOrIcon({ src, alt, fallback }: { src: string; alt: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return <img src={src} style={IMG_FILL} alt={alt} onError={() => setFailed(true)} />
}

/** Nội dung `#ai-thumb-main-${idx}` sau khi timer thumbnail ghi vào (wrap.innerHTML = ...). */
function ThumbOverride({ thumb }: { thumb: AiThumbView }) {
  switch (thumb.kind) {
    case 'slash':
      return <SlashIcon />
    case 'video':
      return <video src={thumb.src} style={IMG_FILL} muted playsInline></video>
    case 'evidence':
      return <ImgOrIcon src={thumb.src} alt="bằng chứng" fallback={<SlashIcon />} />
    case 'capture':
      return (
        <ImgOrIcon
          src={thumb.src}
          alt="unknown"
          fallback={
            <i
              className="fa-solid fa-user-secret"
              style={{ color: 'var(--color-warning)', fontSize: '1.6rem' }}
              aria-hidden="true"
            ></i>
          }
        />
      )
    case 'driverPhoto':
      return <ImgOrIcon src={thumb.src} alt="driver" fallback={<ViewfinderIcon />} />
    case 'viewfinder':
      return <ViewfinderIcon />
  }
}

/** thumbHtml ban đầu của card */
function InitialThumb({ ev, isIdentify }: { ev: Loose; isIdentify: boolean }) {
  if (isIdentify) {
    return <i className="fa-solid fa-circle-notch fa-spin event-icon-placeholder" aria-hidden="true"></i>
  }
  if (ev.images && ev.images.length > 0) {
    const imgPath: string = ev.images[0]
    const currentImg = imgPath.startsWith('http') ? imgPath : api.BASE_URL.replace(/\/api\/$/, '') + imgPath
    return (
      <img
        src={currentImg}
        className="ai-thumbnail-img h-full w-full object-cover"
        alt=""
        onError={(e) => {
          e.currentTarget.src = '/img/placeholder.jpg'
        }}
      />
    )
  }
  return <i className="fa-solid fa-image-slash event-icon-placeholder" aria-hidden="true"></i>
}

function AiEventCard({ ev, idx, thumb }: { ev: Loose; idx: number; thumb: AiThumbView | undefined }) {
  const isIdentify = ev._type === 'identify'
  const isUnknown =
    isIdentify && (!ev.driverName || ev.driverName.toLowerCase().includes('unknown') || ev.driverName === '0')

  const isCritical = CRITICAL_CODES.includes(String(ev.armType))
  const badgeColor = isIdentify ? (isUnknown ? 'var(--color-warning)' : '#8b5cf6') : isCritical ? 'var(--color-danger)' : '#f59e0b'
  const badgeLabel = isIdentify ? (isUnknown ? 'CẢNH BÁO' : 'NHẬN DẠNG') : isCritical ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'

  let nameOnly = ev.driverName || ''
  if (isIdentify && ev.driverName) {
    const match = ev.driverName.match(/^(.*?)\s*\((.*)\)$/)
    if (match) nameOnly = match[1].trim()
    else {
      const idMatch = ev.driverName.trim().match(/^(\d+)$/)
      if (idMatch) nameOnly = getDriverMapping()[idMatch[1]] || idMatch[1]
    }
  }

  // Lấy thời gian từ fileTime (đã được sửa lệch 1h ở backend)
  const evtDate = ev.fileTime ? new Date(ev.fileTime) : null
  const timeStr = evtDate ? evtDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }) : '--'

  const focusLat = ev.blat ? ev.blat / 1000000 : 0
  const focusLng = ev.blng ? ev.blng / 1000000 : 0

  return (
    <li
      className="ai-event-card flex min-h-[140px] cursor-pointer overflow-hidden rounded-lg border border-solid border-border bg-surface shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] transition-[transform,box-shadow] duration-200 ease-[ease] hover:-translate-y-[2px] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] min-[1025px]:max-[1919px]:min-h-[129px]"
      onClick={() => openAiEventModal(idx)}
    >
      {/* Cột thông tin (Bên trái) */}
      <div className="ai-card-info flex min-w-0 flex-[1.2] flex-col justify-between px-[0.85rem] py-[0.65rem]">
        <div className="ai-card-header mb-1 flex items-center justify-between">
          <span
            className="ai-badge-ui rounded-[4px] px-2 py-[0.15rem] text-[0.6rem] font-extrabold text-white uppercase"
            style={{ background: badgeColor }}
          >
            {badgeLabel}
          </span>
          <span className="ai-card-index text-[0.7rem] font-bold text-text-muted opacity-50">#{idx + 1}</span>
        </div>
        <div className="ai-behavior-title mb-[0.4rem] text-[0.88rem] leading-[1.25] font-bold text-text-main">
          {isUnknown ? 'Tài xế không xác định' : isIdentify ? nameOnly : ev.typeName}
        </div>
        <div className="ai-meta-grid flex flex-col gap-1 [&_i]:w-[14px] [&_i]:text-primary [&_i]:opacity-80">
          <div className="ai-meta-item flex items-center gap-[0.4rem] text-[0.75rem] text-text-muted">
            <i className="fa-solid fa-car" aria-hidden="true"></i>
            <span>{ev.vehicleName}</span>
          </div>
          <div className="ai-meta-item flex items-center gap-[0.4rem] text-[0.75rem] text-text-muted">
            <i className="fa-solid fa-clock" aria-hidden="true"></i>
            <span>{ev.stmStr || timeStr}</span>
          </div>
          {focusLat ? (
            <div className="ai-meta-item flex items-center gap-[0.4rem] text-[0.75rem] text-text-muted">
              <i className="fa-solid fa-location-dot" aria-hidden="true"></i>
              <span className="ai-gps-coord font-medium text-primary underline">
                {focusLat.toFixed(5)}, {focusLng.toFixed(5)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Cột Hình ảnh (Bên phải) */}
      <div
        className="ai-card-media relative flex min-w-[120px] flex-1 items-center justify-center overflow-hidden border-0 border-l border-solid border-border bg-black"
        id={`ai-thumb-main-${idx}`}
      >
        {thumb ? <ThumbOverride thumb={thumb} /> : <InitialThumb ev={ev} isIdentify={isIdentify} />}
      </div>
    </li>
  )
}

function AiEventsList({ list }: { list: AiEventsListView }) {
  const thumbs = useAiEventsStore((s) => s.thumbs)
  switch (list.kind) {
    case 'initial':
      return <li className={EMPTY_LI}>Chưa có sự kiện AI nào được ghi nhận.</li>
    case 'loading':
      return (
        <li className={`${EMPTY_LI} border-none bg-none`}>
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Đang tải sự kiện AI...
        </li>
      )
    case 'empty':
      return <li className={EMPTY_LI}>{list.text}</li>
    case 'error':
      return (
        <li className={EMPTY_LI}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Lỗi tải dữ liệu. Hãy thử lại sau.
        </li>
      )
    case 'list':
      // key theo rev: mỗi lần renderAiEvents là innerHTML mới
      return list.items.map((ev, idx) => <AiEventCard key={`${list.rev}-${idx}`} ev={ev} idx={idx} thumb={thumbs[idx]} />)
  }
}

export function AiEventsPanel() {
  const pollingStarted = useAiEventsStore((s) => s.pollingStarted)
  const rightTab = useLiveviewStore((s) => s.rightTab)
  // setInterval 3 s của startAiEventsPolling: chỉ tải khi #rtab-ai-events đang active
  useQuery({ ...aiEventsQueryOptions(), enabled: pollingStarted && rightTab === 'ai-events' })

  const search = useAiEventsStore((s) => s.search)
  const list = useAiEventsStore((s) => s.list)

  return (
    <div className="ai-events-panel flex h-full flex-1 flex-col overflow-hidden bg-surface">
      <div className="ai-events-filter flex gap-2 border-b border-solid border-border p-3">
        <input
          type="text"
          id="ai-event-search"
          aria-label="Tìm sự kiện, xe..."
          className="liveview-filter-select flex-1 cursor-text"
          placeholder="Tìm sự kiện, xe..."
          value={search}
          onChange={(e) => onAiSearchInput(e.target.value)}
        />
        <Button size="sm" id="refresh-ai-events" title="Làm mới" aria-label="Làm mới" onClick={onRefreshAiEventsClick}>
          <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
        </Button>
      </div>
      <ul
        className="ai-events-list m-0 flex flex-1 list-none flex-col gap-3 overflow-y-auto bg-[#f1f5f9] p-3"
        id="ai-events-list"
      >
        <AiEventsList list={list} />
      </ul>
      <AiEventModal />
    </div>
  )
}
