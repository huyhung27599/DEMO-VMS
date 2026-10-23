import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { onRefreshClick } from '../actions'
import { CompanyDropdown } from './CompanyDropdown'
import { SosDropdown } from './SosDropdown'

/** Bộ lọc mockup: nút mở panel; company/SOS/refresh luôn mount để giữ logic + test. */
export function FilterBar() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#334155] shadow-sm transition hover:border-[#c92038]/30 hover:text-[#c92038]"
        aria-expanded={open}
      >
        <i className="fa-solid fa-filter" aria-hidden /> Bộ lọc
      </button>

      <div
        className={
          open
            ? 'absolute top-[calc(100%+8px)] right-0 z-30 flex min-w-[300px] flex-col gap-3 rounded-2xl border border-[#eef2f6] bg-white p-3 shadow-lg'
            : 'sr-only'
        }
      >
        <CompanyDropdown />
        <div className="flex items-center gap-2">
          <SosDropdown />
          <Button variant="primary" id="refresh-liveview" className="flex-1" onClick={onRefreshClick}>
            <i className="fa-solid fa-rotate-right" aria-hidden /> Làm mới
          </Button>
        </div>
      </div>
    </div>
  )
}
