import { useState } from 'react'
import { MAX_DRIVER_PHOTOS, portraitServerDisplayUrl } from '../lib'

// driver.js:1732-1773 renderPortraitGrid: ô trống có nút "Thêm ảnh"; ô có ảnh có nút gỡ.

type PortraitCellProps = { idx: number; imgSrc: string; onRemove: (slot: number) => void }

/** onerror của bản gốc thay cả nội dung ô (kể cả nút gỡ) bằng icon ảnh. */
function PortraitCell({ idx, imgSrc, onRemove }: PortraitCellProps) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="relative h-16 overflow-hidden rounded-[10px] border border-black/8 bg-[#f1f5f9]">
      {broken ? (
        <div className="flex h-16 items-center justify-center text-[#94a3b8]">
          <i className="fa-solid fa-image" aria-hidden="true"></i>
        </div>
      ) : (
        <>
          <img src={imgSrc} alt={`Portrait ${idx + 1}`} className="size-full object-cover" onError={() => setBroken(true)} />
          <button
            type="button"
            className="driver-portrait-remove-btn absolute top-[2px] right-[2px] size-[22px] cursor-pointer rounded-full border-none bg-black/55 p-0 text-xs leading-none text-white focus-visible:outline-2 focus-visible:outline-primary"
            data-slot={idx}
            title="Gỡ ảnh"
            aria-label="Gỡ ảnh"
            onClick={() => onRemove(idx)}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </>
      )}
    </div>
  )
}

type PortraitGridProps = {
  portraitLocalBase64: (string | null)[]
  portraitServerUrls: (string | null)[]
  onAdd: (slot: number) => void
  onRemove: (slot: number) => void
}

export function PortraitGrid({ portraitLocalBase64, portraitServerUrls, onAdd, onRemove }: PortraitGridProps) {
  return (
    <div id="driver-portraitLibrary" className="grid grid-cols-5 gap-2">
      {Array.from({ length: MAX_DRIVER_PHOTOS }).map((_, idx) => {
        const localB64 = portraitLocalBase64[idx]
        const serverRaw = portraitServerUrls[idx]
        const hasLocal = !!localB64
        const hasServer = !hasLocal && !!serverRaw

        if (!hasLocal && !hasServer) {
          return (
            <div
              key={`empty-${idx}`}
              className="driver-portrait-cell flex h-16 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-border bg-[#f8fafc] p-1 text-[#64748b]"
            >
              <button
                type="button"
                className="driver-portrait-add-btn cursor-pointer rounded-md border border-border bg-white px-2 py-1 text-[0.7rem] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary"
                data-slot={idx}
                title={`Thêm ảnh vào ô ${idx + 1}`}
                onClick={() => onAdd(idx)}
              >
                <i className="fa-solid fa-upload mr-1" aria-hidden="true"></i>Thêm ảnh
              </button>
            </div>
          )
        }

        const imgSrc = hasLocal ? (localB64 as string) : portraitServerDisplayUrl(serverRaw as string)
        return <PortraitCell key={`img-${idx}-${imgSrc}`} idx={idx} imgSrc={imgSrc} onRemove={onRemove} />
      })}
    </div>
  )
}
