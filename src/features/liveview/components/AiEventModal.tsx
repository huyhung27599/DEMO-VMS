import { createPortal } from 'react-dom'
import { api } from '../../../shared/api/endpoints'
import { closeAiEventModal, navModalImg, useAiEventsStore, type AiModalView } from '../aiQueries'

// liveview.js:788-922 — window.openAiEventModal / navModalImg / closeAiEventModal.
// Bản gốc chèn overlay vào cuối <body> (insertAdjacentHTML) và KHÔNG có CSS nào cho .ai-modal-*
// (không có trong css/*.css hay index.html): overlay hiện ra như khối không định dạng sau app,
// chỉ có style inline. Giữ nguyên: portal vào document.body, chỉ các style inline của bản gốc.

const CRITICAL_CODES = ['600', '601', '602', '603', '604', '618', '619', '620', '621', '622', '623', '624', '631', '643']

function ModalVisual({ modal }: { modal: AiModalView }) {
  const { ev } = modal
  const isIdentify = ev._type === 'identify'
  const isUnknown =
    isIdentify && (!ev.driverName || ev.driverName.toLowerCase().includes('unknown') || ev.driverName === '0')

  if (ev.images && ev.images.length > 0) {
    return (
      <>
        <div className="ai-modal-img-wrapper">
          <img src={modal.imgSrc} className="ai-modal-img" id="modal-main-img" alt="" />
        </div>
        {ev.images.length > 1 ? (
          <>
            <div className="ai-modal-nav">
              <button type="button" className="ai-modal-nav-btn" aria-label="Ảnh trước" onClick={() => navModalImg(-1)}>
                <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
              </button>
              <button type="button" className="ai-modal-nav-btn" aria-label="Ảnh sau" onClick={() => navModalImg(1)}>
                <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
            <div className="ai-modal-counter" id="modal-img-counter">
              {modal.counterText}
            </div>
          </>
        ) : null}
      </>
    )
  }
  if (isUnknown && ev.captureImg) {
    return (
      <div className="ai-modal-img-wrapper">
        <img
          src={api.BASE_URL + 'face/capture/' + ev.captureImg.split(/[/\\]/).pop()}
          className="ai-modal-img"
          alt=""
        />
      </div>
    )
  }
  return (
    <div style={{ color: 'white', opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <i className="fa-solid fa-image-slash" style={{ fontSize: '3rem' }} aria-hidden="true"></i>
      <span>KHÔNG CÓ HÌNH ẢNH BIÊN BẢN</span>
    </div>
  )
}

function ModalOverlay({ modal }: { modal: AiModalView }) {
  const { ev } = modal
  const lat = ev.blat ? ev.blat / 1000000 : 0
  const lng = ev.blng ? ev.blng / 1000000 : 0

  const isIdentify = ev._type === 'identify'
  const isUnknown =
    isIdentify && (!ev.driverName || ev.driverName.toLowerCase().includes('unknown') || ev.driverName === '0')
  const isCritical = CRITICAL_CODES.includes(String(ev.armType))
  const badgeColor = isIdentify ? (isUnknown ? 'var(--color-warning)' : '#8b5cf6') : isCritical ? 'var(--color-danger)' : '#f59e0b'
  const badgeLabel = isIdentify ? (isUnknown ? 'CẢNH BÁO' : 'NHẬN DẠNG') : isCritical ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'
  const displayTypeName = isUnknown ? 'Tài xế không xác định' : ev.typeName

  return (
    // onclick="closeAiEventModal(event)" trên overlay; container chặn lan truyền
    <div
      className={`ai-modal-overlay${modal.active ? ' active' : ''}`}
      id="ai-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={String(displayTypeName ?? '')}
      onClick={closeAiEventModal}
    >
      <div className="ai-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <span className="ai-modal-badge" style={{ background: badgeColor, color: 'white' }}>
              {badgeLabel}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-text-main)' }}>{displayTypeName}</h3>
          </div>
          <button type="button" className="ai-modal-close" aria-label="Đóng" onClick={closeAiEventModal}>
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div className="ai-modal-body">
          <div className="ai-modal-info">
            <div className="ai-info-group">
              <span className="ai-info-label">Phương tiện</span>
              <div className="ai-info-value">
                <i className="fa-solid fa-car" aria-hidden="true"></i> {ev.vehicleName}
              </div>
            </div>
            <div className="ai-info-group">
              <span className="ai-info-label">Thời gian vi phạm</span>
              <div className="ai-info-value">
                <i className="fa-solid fa-clock" aria-hidden="true"></i>{' '}
                <span className="ai-modal-event-time">{ev.stmStr}</span>
              </div>
            </div>
            {lat ? (
              <div className="ai-info-group">
                <span className="ai-info-label">Vị trí GPS</span>
                <div className="ai-info-value">
                  <i className="fa-solid fa-location-dot" aria-hidden="true"></i>{' '}
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </a>
                </div>
              </div>
            ) : null}
            {ev.position ? (
              <div className="ai-info-group">
                <span className="ai-info-label">Địa chỉ</span>
                <div className="ai-info-value" style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.4 }}>
                  {ev.position}
                </div>
              </div>
            ) : null}
          </div>
          <div className="ai-modal-visual">
            <ModalVisual modal={modal} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AiEventModal() {
  const modal = useAiEventsStore((s) => s.modal)
  return modal ? createPortal(<ModalOverlay key={modal.id} modal={modal} />, document.body) : null
}
