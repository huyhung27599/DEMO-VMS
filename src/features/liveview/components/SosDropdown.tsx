import { useEffect, useRef } from 'react'
import { Button } from '../../../shared/ui/Button'
import { closeDropdown, onDropdownButtonClick } from '../actions'
import { useLiveviewStore } from '../store'

// index.html:865-888 #sos-icon-wrapper (.icon-select-wrapper) + styles2.css:896-1118.
// Chỉ initDropdownToggles (liveview.js:225-255) đụng tới: bật/tắt `open`. Danh sách SOS, badge và nút
// "Xóa tất cả" không có JS nào xử lý trong bản gốc -> giữ tĩnh.
export function SosDropdown() {
  const open = useLiveviewStore((s) => s.openDropdown === 'sos')
  const initialized = useLiveviewStore((s) => s.initialized)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // liveview.js:241-247 — listener click trên document gắn trong init(): click ngoài wrapper thì đóng
  useEffect(() => {
    if (!initialized) return
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) closeDropdown()
    }
    document.addEventListener('click', onDocClick, { passive: true })
    return () => document.removeEventListener('click', onDocClick)
  }, [initialized])

  return (
    <div ref={wrapperRef} className={`icon-select-wrapper relative inline-block ${open ? 'open' : ''}`} id="sos-icon-wrapper">
      <button
        type="button"
        id="sos-icon-btn"
        title="Cảnh báo SOS"
        aria-label="Cảnh báo SOS"
        aria-expanded={open}
        className={`icon-action-btn sos-btn liveview-sos-btn relative flex h-10 w-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-solid bg-surface p-2 font-sans text-sm text-text-main transition-all duration-250 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          open ? 'border-primary shadow-[0_0_0_2px_rgba(42,157,216,0.15)]' : 'border-border'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onDropdownButtonClick('sos')
        }}
      >
        <i className="fa-solid fa-bell text-[1.25rem] text-[#f59e0b]" aria-hidden="true"></i>
        <span
          className="sos-badge absolute -top-[2px] -right-[2px] hidden h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border-2 border-solid border-bg bg-danger px-1 text-[0.65rem] font-bold text-white"
          id="sos-badge"
        >
          0
        </span>
      </button>
      <div
        id="sos-dropdown"
        className={`icon-dropdown sos-dropdown liveview-icon-dropdown absolute top-[calc(100%+8px)] right-0 z-[20000] w-[320px] flex-col overflow-hidden rounded-md border border-solid border-border bg-surface shadow-md ${
          open ? 'flex' : 'hidden'
        }`}
      >
        <div className="icon-dropdown-header border-b border-solid border-border bg-[rgba(42,157,216,0.05)] px-4 py-3 text-sm font-semibold text-text-main">
          Cảnh báo SOS từ tài xế
        </div>
        <ul className="sos-list m-0 max-h-[300px] list-none overflow-y-auto p-0" id="sos-list">
          <li className="sos-empty px-4 py-6 text-center text-sm text-text-muted">Không có cảnh báo SOS mới</li>
        </ul>
        <div className="sos-footer border-t border-solid border-border bg-[#f8fafc] px-4 py-2 text-center">
          <Button size="sm" id="clear-sos-btn">
            Xóa tất cả
          </Button>
        </div>
      </div>
    </div>
  )
}
