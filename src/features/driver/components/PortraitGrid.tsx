import { useState } from 'react'
import { MAX_DRIVER_PHOTOS, portraitServerDisplayUrl } from '../lib'

// driver.js:1732-1773 renderPortraitGrid: ô trống có nút "Thêm ảnh"; ô có ảnh có nút gỡ.

type PortraitCellProps = { idx: number; imgSrc: string; onRemove: (slot: number) => void }

/** onerror của bản gốc thay cả nội dung ô (kể cả nút gỡ) bằng icon ảnh. */
function PortraitCell({ idx, imgSrc, onRemove }: PortraitCellProps) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#1e293b]">
      {broken ? (
        <div className="flex size-full items-center justify-center text-[#94a3b8]">
          <i className="fa-solid fa-face-viewfinder text-xl" aria-hidden="true"></i>
        </div>
      ) : (
        <>
          <img src={imgSrc} alt={`Portrait ${idx + 1}`} className="size-full object-cover" onError={() => setBroken(true)} />
          <button
            type="button"
            className="driver-portrait-remove-btn absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full border-none bg-black/55 p-0 text-xs leading-none text-white focus-visible:outline-2 focus-visible:outline-primary"
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
    <div id="driver-portraitLibrary" className="grid grid-cols-5 gap-2 max-[520px]:grid-cols-3">
      {Array.from({ length: MAX_DRIVER_PHOTOS }).map((_, idx) => {
        const localB64 = portraitLocalBase64[idx]
        const serverRaw = portraitServerUrls[idx]
        const hasLocal = !!localB64
        const hasServer = !hasLocal && !!serverRaw

        if (!hasLocal && !hasServer) {
          return (
            <div
              key={`empty-${idx}`}
              className="driver-portrait-cell flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]"
            >
              <button
                type="button"
                className="driver-portrait-add-btn flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-none bg-transparent text-[#94a3b8] focus-visible:outline-2 focus-visible:outline-primary"
                data-slot={idx}
                title={`Thêm ảnh vào ô ${idx + 1}`}
                aria-label={`Thêm ảnh vào ô ${idx + 1}`}
                onClick={() => onAdd(idx)}
              >
                <i className="fa-solid fa-plus text-lg" aria-hidden="true"></i>
                <span className="text-[0.65rem] font-semibold">Thêm ảnh</span>
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
