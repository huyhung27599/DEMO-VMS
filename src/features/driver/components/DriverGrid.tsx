import { useState } from 'react'
import { api } from '../../../shared/api/endpoints'
import { Button } from '../../../shared/ui/Button'
import { faceState } from '../faceEvents'
import { driverAvatarUrls, nextLocalAvatarSrc, type Loose } from '../lib'
import type { DriverGridView } from '../store'

// driver.js:953-1037 renderDrivers + css/driver.css (.driver-grid, .driver-card, ...)

const avatarClass =
  'driver-avatar mb-4 size-[100px] rounded-full border-[3px] border-bg bg-bg object-cover shadow-[0_4px_6px_rgba(0,0,0,0.1)]'

function AvatarPlaceholder() {
  return (
    <div className="driver-avatar-placeholder mb-4 flex size-[100px] items-center justify-center rounded-full bg-border text-[2rem] text-text-muted">
      <i className="fa-solid fa-user-tie" aria-hidden="true"></i>
    </div>
  )
}

/** Ảnh upstream: lỗi -> placeholder. */
function RemoteAvatar({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? <AvatarPlaceholder /> : <img src={src} className={avatarClass} onError={() => setFailed(true)} alt="Avatar" />
}

/** Ảnh known_faces cục bộ: lỗi -> face.jpg -> face_2.jpg -> placeholder. */
function LocalAvatar({ src: initialSrc }: { src: string }) {
  const [src, setSrc] = useState(initialSrc)
  return src ? (
    <img src={src} className={avatarClass} onError={() => setSrc((s) => nextLocalAvatarSrc(s))} alt="Avatar" />
  ) : (
    <AvatarPlaceholder />
  )
}

type DriverCardProps = {
  driver: Loose
  deleting: boolean
  onEdit: (id: string) => void
  onDelete: (args: { id: string; jobNum: string; name: string }) => void
}

function DriverCard({ driver: d, deleting, onEdit, onDelete }: DriverCardProps) {
  const name = d.dn || 'Chưa rõ tên'
  const idno = d.jn || d.id || 'N/A'
  const phone = d.dt || 'N/A'
  const gender = d.sx === 1 ? '♂ Nam' : d.sx === 2 ? '♀ Nữ' : '--'
  // driverMapping đã load xong trước khi render (await trong loadDrivers)
  const { finalFaceUrl, localFaceUrl } = driverAvatarUrls(d, api.BASE_URL, faceState.driverMapping)
  // data-id / data-jn của bản gốc là chuỗi nội suy (`${d.id}` -> 'undefined' nếu thiếu)
  const id = `${d.id}`
  const jobNum = `${d.jn || ''}`

  return (
    <div
      className="driver-card relative flex flex-col items-center overflow-hidden rounded-md border border-border p-6 text-center transition-[transform,box-shadow] duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md"
      data-driver-id={id}
      data-jn={jobNum}
    >
      {finalFaceUrl ? (
        <RemoteAvatar key={finalFaceUrl} src={finalFaceUrl} />
      ) : localFaceUrl ? (
        <LocalAvatar key={localFaceUrl} src={localFaceUrl} />
      ) : (
        <AvatarPlaceholder />
      )}
      <div className="driver-name mb-1 text-[1.2rem] font-semibold">{name}</div>
      <div className="driver-info mb-1 text-[0.85rem] text-text-muted">
        <i className="fa-solid fa-id-card" aria-hidden="true"></i> {idno}
      </div>
      <div className="driver-info mb-1 text-[0.85rem] text-text-muted">
        <i className="fa-solid fa-phone" aria-hidden="true"></i> {phone}
      </div>
      <div className="driver-info mb-1 text-[0.85rem] text-text-muted">
        <i className="fa-solid fa-venus-mars" aria-hidden="true"></i> {gender}
      </div>
      <div className="driver-actions mt-4 flex w-full gap-2">
        <Button size="sm" className="btn-driver-edit flex-1" title="Sửa tài xế" aria-label="Sửa tài xế" onClick={() => onEdit(id)}>
          <i className="fa-solid fa-pen" aria-hidden="true"></i>
        </Button>
        <button
          type="button"
          className="btn-driver-delete flex w-9 flex-none cursor-pointer items-center justify-center rounded-sm border border-solid border-danger bg-transparent p-0 py-[0.3rem] text-xs text-danger transition-colors duration-250 enabled:hover:bg-danger enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          data-id={id}
          data-name={name}
          title="Xóa tài xế"
          aria-label="Xóa tài xế"
          disabled={deleting}
          onClick={() => onDelete({ id, jobNum, name })}
        >
          {deleting ? (
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
          ) : (
            <i className="fa-solid fa-trash" aria-hidden="true"></i>
          )}
        </button>
      </div>
    </div>
  )
}

type DriverGridProps = {
  view: DriverGridView
  deletingIds: string[]
  onEdit: (id: string) => void
  onDelete: (args: { id: string; jobNum: string; name: string }) => void
}

export function DriverGrid({ view, deletingIds, onEdit, onDelete }: DriverGridProps) {
  return (
    <div className="driver-grid grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6" id="driver-grid">
      {view.kind === 'loading' ? (
        <div className="col-span-full p-8 text-center">
          <i className="fa-solid fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
          <p>Đang tải danh sách tài xế...</p>
        </div>
      ) : view.kind === 'error' ? (
        <div className="col-span-full text-center text-danger">{view.message}</div>
      ) : view.kind === 'list' ? (
        !view.drivers || view.drivers.length === 0 ? (
          <div className="col-span-full p-8 text-center text-text-muted">Không có dữ liệu tài xế.</div>
        ) : (
          view.drivers.map((d, i) => (
            <DriverCard
              key={`${d.id}|${i}`}
              driver={d}
              deleting={deletingIds.includes(`${d.id}`)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )
      ) : null}
    </div>
  )
}
