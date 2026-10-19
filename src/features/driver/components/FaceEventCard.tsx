import { useState } from 'react'
import {
  classifyFaceEvent,
  extractDevIdFromAny,
  faceEventGeoParts,
  formatIdentifyEventTime,
  identifyAlarmTypeLabel,
  pickCaptureFaceUrl,
  toDisplayableImageUrl,
  type Loose,
} from '../lib'
import { openFaceImageLightbox } from '../store'

// driver.js:1433-1506 (một thẻ trong renderFaceEvents) + css/driver.css (.face-event-*)

const SEP = ' | ' // &nbsp;|&nbsp;

function CameraIcon() {
  return <i className="fa-solid fa-camera" style={{ fontSize: '2rem', color: '#94a3b8' }} aria-hidden="true"></i>
}

const wrapperClass = 'face-img-wrapper relative mb-2 aspect-square w-full overflow-hidden rounded-sm'

/** imgBox(url, icoCam): lỗi ảnh -> ẩn ảnh, hiện khung dự phòng nền tối. */
function FaceImageBox({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  if (!url) {
    return (
      <div className={`${wrapperClass} flex items-center justify-center bg-[#f1f5f9]`}>
        <CameraIcon />
      </div>
    )
  }
  return (
    <div className={`${wrapperClass} bg-black`}>
      <img
        src={url}
        alt=""
        loading="lazy"
        className="size-full object-cover"
        style={{ display: failed ? 'none' : undefined }}
        onError={() => setFailed(true)}
      />
      <div
        className="face-img-fallback absolute inset-0 size-full items-center justify-center bg-[#1e293b]"
        style={{ display: failed ? 'flex' : 'none' }}
      >
        <CameraIcon />
      </div>
    </div>
  )
}

export function FaceEventCard({ evt }: { evt: Loose }) {
  const timeStr = formatIdentifyEventTime(evt)
  const plate = evt.vehiIdno || evt.vi || evt.nm || evt.vehicleName || evt.devIdno || 'Không rõ xe'
  const dName = evt.driverName || evt.dn || evt.dName || '—'
  const ty = evt.ty ?? evt.armType ?? evt.alarmType
  const subType = evt.typeName || identifyAlarmTypeLabel(ty)
  // srcLabel của bản gốc được tính nhưng không render
  const geoParts = faceEventGeoParts(evt)
  const guidShort = evt.guid ? String(evt.guid).slice(0, 40) : ''

  const cls = classifyFaceEvent(evt)
  const capUrl = toDisplayableImageUrl(pickCaptureFaceUrl(evt))
  const devText = String(evt.devIdno || evt.did || extractDevIdFromAny(evt) || '—')

  return (
    <div className="face-event-card overflow-hidden rounded-md border border-border transition-[transform,box-shadow] duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md">
      <div className="face-event-header flex items-center justify-between border-b border-border bg-[rgba(59,130,246,0.1)] px-4 py-3">
        <div>
          <div className="face-event-title flex items-center gap-2 font-semibold text-primary">
            <i className="fa-solid fa-face-viewfinder" aria-hidden="true"></i> {String(dName)}
          </div>
          {subType ? <div className="mt-[2px] text-[0.75rem] text-text-muted">{String(subType)}</div> : null}
        </div>
        <div className="face-event-time text-[0.8rem] text-text-muted">{String(timeStr)}</div>
      </div>
      <div className="face-event-body flex gap-4 p-4">
        <div className="face-comparison relative block w-full gap-2">
          <div className="face-col mx-auto flex w-full max-w-[420px] flex-col items-center text-center">
            <button
              type="button"
              className="face-event-image-btn block w-full cursor-zoom-in border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-primary"
              data-image={capUrl}
              title="Bấm để phóng to ảnh sự kiện"
              onClick={() => {
                if (capUrl) openFaceImageLightbox(capUrl)
              }}
            >
              <FaceImageBox key={capUrl} url={capUrl} />
            </button>
            <span className="face-label text-[0.8rem] font-medium text-text-muted">Ảnh sự kiện xác minh</span>
          </div>
        </div>
      </div>
      <div className="face-event-footer border-t border-border bg-black/2 px-4 py-3 text-[0.85rem] text-text-muted">
        <i className="fa-solid fa-truck" aria-hidden="true"></i> Xe: <strong>{String(plate)}</strong>
        {SEP}Thiết bị: <span className="font-mono">{devText}</span>
        {evt.driverCode ? (
          <>
            {SEP}Mã tài xế: <strong>{String(evt.driverCode)}</strong>
          </>
        ) : null}
        {SEP}
        <span style={{ color: cls.statusColor, fontWeight: 600 }}>{cls.statusText}</span>
        {guidShort ? (
          <>
            {SEP}
            <code className="text-[0.68rem] opacity-85" title="ID">
              {guidShort}
            </code>
          </>
        ) : null}
        {geoParts.map((part) => (
          <span key={part}>
            {SEP}
            {part}
          </span>
        ))}
      </div>
    </div>
  )
}
