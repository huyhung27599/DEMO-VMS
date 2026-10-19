import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isVideoEvidenceUrl, proxyFleetMediaUrl, type EvidenceDetail } from '../evidence'
import { formatSpeedDisplay, getAlarmCode, getApiSeverity, getViolationDisplayName, normalizeSpeed, type AnyRow } from '../lib'
import { closeEventModal } from '../loaders'
import { eventEvidenceQueryOptions } from '../queries'
import { useStatisticsStore } from '../store'

// #stat-event-modal (index.html:1274-1290) + .modal-* (statistics.css:173-225)
// openEventModal/renderEventModalMeta/renderEvidenceMediaHtml (events.js:1120-1166, 1226-1245) bằng JSX.

const TAG = 'rounded-sm bg-primary/10 px-2 py-1 text-[0.85rem] font-semibold text-primary'
const MUTED_SMALL = 'text-[0.75rem] text-text-muted'

function EventModalMeta({ event, dateStr }: { event: AnyRow; dateStr: string }) {
  const typeName = getViolationDisplayName(event)
  const severityObj = getApiSeverity(event)
  const severityText = severityObj ? severityObj.text : '--'
  const severityColor = severityObj ? severityObj.color : '#64748b'
  const lat = Number.isFinite(event.lat) ? Number(event.lat).toFixed(5) : '--'
  const lng = Number.isFinite(event.lng) ? Number(event.lng).toFixed(5) : '--'
  const spd = formatSpeedDisplay(event)
  const devId = event.did || event.devIdno || ''
  const alarmCode = getAlarmCode(event)
  const sevRgb = severityColor === '#ef4444' ? '239,68,68' : severityColor === '#f59e0b' ? '245,158,11' : '59,130,246'

  return (
    <>
      <span className={TAG}>
        <i className="fa-solid fa-car" aria-hidden="true"></i> Xe: {event.vehicleName}
      </span>
      <span className={TAG}>
        <i className="fa-solid fa-clock" aria-hidden="true"></i> Thời gian: {dateStr}
      </span>
      <span className={TAG} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
        <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> Lỗi vi phạm: {typeName}
        {alarmCode ? (
          <>
            {' '}
            <small style={{ opacity: 0.65 }}>({alarmCode})</small>
          </>
        ) : null}
      </span>
      <span className={TAG} style={{ background: `rgba(${sevRgb}, 0.1)`, color: severityColor }}>
        <i className="fa-solid fa-gauge-high" aria-hidden="true"></i> Mức độ: {severityText}
      </span>
      <span className={TAG}>
        <i className="fa-solid fa-gauge-simple" aria-hidden="true"></i> Tốc độ lúc vi phạm: {spd}
      </span>
      {lat !== '--' ? (
        <span className={TAG}>
          <i className="fa-solid fa-location-dot" aria-hidden="true"></i> GPS: {lat}, {lng}
        </span>
      ) : null}
      {devId ? (
        <span className={TAG}>
          <i className="fa-solid fa-microchip" aria-hidden="true"></i> Thiết bị: {devId}
        </span>
      ) : null}
    </>
  )
}

function EvidenceItem({ item }: { item: EvidenceDetail }) {
  const [imgFailed, setImgFailed] = useState(false)
  const proxiedUrl = proxyFleetMediaUrl(item.url)
  const sp = item.speed != null && item.speed !== '' ? normalizeSpeed(item.speed) : null

  // onerror="this.parentElement.innerHTML='<span …>Không tải được ảnh</span>'"
  if (imgFailed) {
    return (
      <div className="text-center">
        <span style={{ color: '#94a3b8', padding: '1rem' }}>Không tải được ảnh</span>
      </div>
    )
  }

  return (
    <div className="text-center">
      {isVideoEvidenceUrl(item.url) ? (
        <video
          controls
          src={proxiedUrl}
          style={{ maxWidth: '100%', height: 380, borderRadius: 8, background: '#000' }}
        ></video>
      ) : (
        <img
          src={proxiedUrl}
          style={{ maxWidth: '100%', maxHeight: 380, borderRadius: 8, objectFit: 'contain', background: '#f1f5f9' }}
          alt="Bằng chứng vi phạm"
          onError={() => setImgFailed(true)}
        />
      )}
      {item.time ? (
        <div className={`mt-1 ${MUTED_SMALL}`}>
          <i className="fa-solid fa-clock" aria-hidden="true"></i> {String(item.time)}
        </div>
      ) : null}
      {sp !== null ? (
        <div className={MUTED_SMALL}>
          <i className="fa-solid fa-gauge-simple" aria-hidden="true"></i> {sp.toFixed(1)} km/h
        </div>
      ) : null}
      {item.position ? (
        <div className="text-[0.7rem] text-text-muted">
          <i className="fa-solid fa-location-dot" aria-hidden="true"></i> {String(item.position).slice(0, 60)}
        </div>
      ) : null}
    </div>
  )
}

function EvidenceMedia({ allMediaUrls, evidenceDetails }: { allMediaUrls: string[]; evidenceDetails: EvidenceDetail[] }) {
  if (!allMediaUrls.length) {
    return (
      <div className="p-8 text-center">
        <i className="fa-solid fa-image-slash fa-3x mb-3 opacity-30" aria-hidden="true"></i>
        <br />
        <p className="text-text-muted">Không tìm thấy ảnh/video bằng chứng cho sự kiện này.</p>
        <p className="text-[0.8rem] text-text-muted opacity-70">
          Thiết bị có thể chưa tải lên hoặc dữ liệu đã hết hạn lưu trữ.
        </p>
      </div>
    )
  }
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-3">
        {evidenceDetails.map((item, i) => (
          <EvidenceItem key={`${i}-${item.url}`} item={item} />
        ))}
      </div>
      <div className="mt-2 text-center text-[0.78rem] text-text-muted">
        <i className="fa-solid fa-images" aria-hidden="true"></i> Tổng cộng {allMediaUrls.length} bằng chứng (Fleetcontrol)
      </div>
    </div>
  )
}

export function EventModal() {
  const modal = useStatisticsStore((s) => s.modal)
  const open = modal !== null
  const q = useQuery({ ...eventEvidenceQueryOptions(modal ? modal.event : null), enabled: open })

  // Trong lúc tải: meta của sự kiện trong bảng + spinner; xong: meta của freshEvent + media; lỗi: thông báo.
  const loading = q.isFetching || (q.data === undefined && q.error === null)
  const event = modal ? (!loading && q.data ? q.data.freshEvent : modal.event) : null
  const displayDate = modal
    ? modal.dateStr || (modal.event.stm > 0 ? new Date(modal.event.stm * 1000).toLocaleString('vi-VN') : '--')
    : ''

  return (
    <div
      id="stat-event-modal"
      className="fixed inset-0 z-9999 items-center justify-center bg-black/60"
      style={{ display: open ? 'flex' : 'none' }}
      aria-hidden={open ? 'false' : 'true'}
    >
      <div
        className="flex w-[90%] max-w-[800px] flex-col overflow-hidden rounded-md bg-base shadow-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stat-modal-title"
      >
        <div className="flex items-center justify-between border-b border-border bg-[#f8fafc] px-6 py-4">
          <h3 id="stat-modal-title" className="m-0 text-xl">
            Chi tiết bằng chứng vi phạm
          </h3>
          <button
            type="button"
            id="stat-modal-close"
            aria-label="Đóng"
            className="cursor-pointer border-none bg-transparent text-2xl text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
            onClick={closeEventModal}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <div id="stat-modal-meta" className="mb-4 flex flex-wrap gap-4">
            {event && modal ? <EventModalMeta event={event} dateStr={displayDate} /> : null}
          </div>
          <div
            id="stat-modal-media"
            className="flex min-h-[400px] items-center justify-center overflow-hidden rounded-sm bg-black text-center text-white"
          >
            {!open ? null : loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
                <span className="ml-[10px]">Đang tải bằng chứng từ Fleetcontrol...</span>
              </>
            ) : q.error ? (
              <div className="text-center text-danger">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Lỗi khi lấy dữ liệu bằng chứng:{' '}
                {String((q.error as Error).message || q.error)}
              </div>
            ) : q.data ? (
              <EvidenceMedia allMediaUrls={q.data.allMediaUrls} evidenceDetails={q.data.evidenceDetails} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
