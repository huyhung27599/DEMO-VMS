import { useState } from 'react'
import { api } from '../../../shared/api/endpoints'
import { faceState } from '../faceEvents'
import { driverAvatarUrls, nextLocalAvatarSrc, type Loose } from '../lib'
import type { DriverGridView } from '../store'

// driver.js:953-1037 renderDrivers + css/driver.css (.driver-grid, .driver-card, ...)

function initialLetter(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/)
  return (parts[parts.length - 1][0] || t[0]).toUpperCase()
}

function AvatarPlaceholder({ letter }: { letter: string }) {
  return (
    <div className="driver-avatar-placeholder flex size-14 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-lg font-bold text-white">
      <span className="sr-only">
        <i className="fa-solid fa-user-tie" aria-hidden="true"></i>
      </span>
      {letter}
    </div>
  )
}

function RemoteAvatar({ src, letter }: { src: string; letter: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <AvatarPlaceholder letter={letter} />
  ) : (
    <img
      src={src}
      className="driver-avatar size-14 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
      onError={() => setFailed(true)}
      alt="Avatar"
    />
  )
}

function LocalAvatar({ src: initialSrc, letter }: { src: string; letter: string }) {
  const [src, setSrc] = useState(initialSrc)
  return src ? (
    <img
      src={src}
      className="driver-avatar size-14 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
      onError={() => setSrc((s) => nextLocalAvatarSrc(s))}
      alt="Avatar"
    />
  ) : (
    <AvatarPlaceholder letter={letter} />
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.65rem] font-semibold tracking-[0.06em] text-[#94a3b8] uppercase">{label}</div>
      <div className="truncate text-[0.82rem] font-semibold text-[#334155]">{value}</div>
    </div>
  )
}

type DriverCardProps = {
  driver: Loose
  deleting: boolean
  onEdit: (id: string) => void
  onDelete: (args: { id: string; jobNum: string; name: string }) => void
  onDetail: (driver: Loose) => void
}

function DriverCard({ driver: d, deleting, onEdit, onDelete, onDetail }: DriverCardProps) {
  const name = d.dn || 'Chưa rõ tên'
  const idno = d.jn || d.id || 'N/A'
  const phone = d.dt || '—'
  const licenseType = d.licenseType || d.driverType || d.lt || '—'
  const licenseLabel = licenseType === '—' ? '—' : String(licenseType).startsWith('Hạng') ? String(licenseType) : `Hạng ${licenseType}`
  const vehicle = d.vehiIdno || d.nm || d.plate || 'Chưa gán'
  const expiry = d.licenseExpire || d.le || d.expireDate || '—'
  const letter = initialLetter(String(name))
  const { finalFaceUrl, localFaceUrl } = driverAvatarUrls(d, api.BASE_URL, faceState.driverMapping)
  const id = `${d.id}`
  const jobNum = `${d.jn || ''}`

  return (
    <div
      className="driver-card flex flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white p-4 shadow-sm transition hover:border-[#f5c2c9] hover:shadow-md"
      data-driver-id={id}
      data-jn={jobNum}
    >
      <div className="mb-3 flex items-center gap-3">
        {finalFaceUrl ? (
          <RemoteAvatar key={finalFaceUrl} src={finalFaceUrl} letter={letter} />
        ) : localFaceUrl ? (
          <LocalAvatar key={localFaceUrl} src={localFaceUrl} letter={letter} />
        ) : (
          <AvatarPlaceholder letter={letter} />
        )}
        <div className="min-w-0">
          <div className="driver-name truncate text-[1.05rem] font-bold text-[#0f172a]">{name}</div>
          <div className="driver-info text-[0.8rem] text-[#94a3b8]">
            Mã: {idno}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f8fafc] p-3">
        <MetaCell label="SĐT" value={String(phone)} />
        <MetaCell label="GPLX" value={licenseLabel} />
        <MetaCell label="Phương tiện" value={String(vehicle)} />
        <MetaCell label="Hết hạn GPLX" value={String(expiry)} />
      </div>

      <div className="driver-actions mt-auto flex items-center gap-2">
        <button
          type="button"
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-[0.8rem] font-semibold text-[#334155] transition hover:border-[#e11d48]/30 hover:text-[#e11d48]"
          onClick={() => onDetail(d)}
        >
          Chi tiết
        </button>
        <button
          type="button"
          className="btn-driver-edit flex size-9 cursor-pointer items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] transition hover:border-[#e11d48]/30 hover:text-[#e11d48]"
          title="Sửa tài xế"
          aria-label="Sửa tài xế"
          onClick={() => onEdit(id)}
        >
          <i className="fa-solid fa-pen" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className="btn-driver-delete flex size-9 cursor-pointer items-center justify-center rounded-xl border border-[#fecaca] bg-white text-[#e11d48] transition enabled:hover:bg-[#e11d48] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
  onDetail: (driver: Loose) => void
}

export function DriverGrid({ view, deletingIds, onEdit, onDelete, onDetail }: DriverGridProps) {
  return (
    <div className="driver-grid grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4" id="driver-grid">
      {view.kind === 'loading' ? (
        <div className="col-span-full p-8 text-center text-[#64748b]">
          <i className="fa-solid fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
          <p>Đang tải danh sách tài xế...</p>
        </div>
      ) : view.kind === 'error' ? (
        <div className="col-span-full text-center text-danger">{view.message}</div>
      ) : view.kind === 'list' ? (
        !view.drivers || view.drivers.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[#e2e8f0] bg-white p-10 text-center text-[#94a3b8]">
            Không có dữ liệu tài xế.
          </div>
        ) : (
          view.drivers.map((d, i) => (
            <DriverCard
              key={`${d.id}|${i}`}
              driver={d}
              deleting={deletingIds.includes(`${d.id}`)}
              onEdit={onEdit}
              onDelete={onDelete}
              onDetail={onDetail}
            />
          ))
        )
      ) : null}
    </div>
  )
}
