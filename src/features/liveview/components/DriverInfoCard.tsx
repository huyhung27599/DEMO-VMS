import type { SyntheticEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { driverInfoQueryOptions, useDriverInfoStore, useDrivingDuration, type DriverCardView } from '../driverInfo'

// Nội dung [data-driver-content] của video wall (liveview.js:1238-1380 renderDriverInfo).
// Ảnh phóng to khi hover (onmouseenter/onmouseleave của bản gốc) và chấm trạng thái ẩn đi: dùng peer-hover.

const AVATAR =
  'driver-avatar-zoomable peer relative z-[1000] h-[42px] w-[42px] origin-center cursor-zoom-in rounded-full border-[3px] border-solid object-cover transition-all duration-300 ease-[ease] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
const DOT =
  'driver-presence-dot absolute right-0 bottom-0 z-[1001] h-3 w-3 rounded-full border-2 border-solid border-white opacity-100 peer-hover:opacity-0'
const TEXT_COL = 'flex min-w-0 flex-1 flex-col justify-center gap-[2px] pl-[10px]'
const LINE = 'overflow-hidden text-ellipsis whitespace-nowrap'

/** onerror của ảnh tài xế đã biết: face_1.jpg -> face.jpg -> ảnh chữ cái */
function onKnownAvatarError(e: SyntheticEvent<HTMLImageElement>, fallback: string) {
  const img = e.currentTarget
  if (img.src && img.src.includes('/face_1.jpg')) {
    img.src = img.src.replace('/face_1.jpg', '/face.jpg')
    return
  }
  img.src = fallback
}

function onUnknownAvatarError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = 'https://ui-avatars.com/api/?name=%3F&background=f59e0b&color=fff&size=64'
}

function DriverCardContent({ view }: { view: DriverCardView }) {
  if (view.kind === 'message') {
    return <div className="text-[0.78rem] text-text-muted">{view.text}</div>
  }

  if (view.kind === 'none') {
    return (
      <>
        <div className="relative shrink-0">
          <img
            src="https://ui-avatars.com/api/?name=%3F&background=64748b&color=fff&size=64"
            alt="Ẩn danh"
            className="h-[38px] w-[38px] rounded-full border-[3px] border-solid border-[#ef4444] object-cover transition-[border-color] duration-300 ease-[ease]"
          />
          <div className="absolute right-0 bottom-0 h-[10px] w-[10px] rounded-full border-2 border-solid border-white bg-[#ef4444] shadow-[0_0_4px_rgba(239,68,68,0.6)]"></div>
        </div>
        <div className="min-w-0 flex-1 leading-[1.4]">
          <div className="flex items-center gap-1 text-[0.8rem] font-semibold text-[#ef4444]">
            <i className="text-[0.7rem]"></i> Không có tài xế
          </div>
        </div>
      </>
    )
  }

  if (view.kind === 'unknown') {
    return (
      <>
        <div className="relative shrink-0 overflow-visible!">
          <img
            src={view.img}
            alt="Unknown"
            className={`${AVATAR} border-[#f59e0b] hover:scale-200`}
            onError={onUnknownAvatarError}
          />
          <div className={`${DOT} bg-[#f59e0b] shadow-[0_0_4px_rgba(245,158,11,0.6)]`}></div>
        </div>
        <div className={TEXT_COL}>
          <div className={`${LINE} text-[0.95rem] font-bold text-[#f59e0b]`}>
            <i className="fa-solid fa-triangle-exclamation text-[0.8rem]" aria-hidden="true"></i> Tài xế không xác định
          </div>
          <div className={`${LINE} text-[0.8rem] font-medium text-text-muted`}>Mã: Unknown</div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="relative shrink-0 overflow-visible!">
        <img
          src={view.avatarSrc}
          alt={view.name}
          className={`${AVATAR} hover:scale-[2.2]`}
          style={{ borderColor: view.borderColor }}
          onError={(e) => onKnownAvatarError(e, view.avatarFallback)}
        />
        <div className={DOT} style={{ backgroundColor: view.dotColor, boxShadow: `0 0 4px ${view.dotShadow}` }}></div>
      </div>
      <div className={TEXT_COL}>
        <div className={`${LINE} text-[0.95rem] font-bold text-[#1e3a8a]`}>{view.name}</div>
        {view.duration ? (
          <div className="mt-[2px] text-[0.75rem] font-bold text-[#10b981]">
            <i className="fa-solid fa-clock" aria-hidden="true"></i> <span data-driving-duration="">{view.duration}</span>
          </div>
        ) : null}
        <div className={`${LINE} text-[0.8rem] font-medium text-text-muted`}>Mã: {view.license}</div>
      </div>
    </>
  )
}

/** Thẻ tài xế của wall `token`: interval 10 s (face check) + ticker 1 s chỉ chạy khi thẻ còn mount. */
export function DriverInfoCard({ deviceId, token }: { deviceId: string; token: number }) {
  const polling = useDriverInfoStore((s) => s.runningPolls[token] === true)
  useQuery({ ...driverInfoQueryOptions(deviceId, token), enabled: polling })
  useDrivingDuration(deviceId, token)
  const card = useDriverInfoStore((s) => s.cards[token])

  if (!card) {
    // index.html/renderUnifiedPlayer: nội dung ban đầu
    return <div className="text-text-muted">Đang tải thông tin...</div>
  }
  // key = rev: mỗi renderDriverInfo dựng lại innerHTML (ảnh tải lại từ đầu như bản gốc)
  return <DriverCardContent key={card.rev} view={card.view} />
}
