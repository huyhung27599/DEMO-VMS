import type { MouseEvent, ReactNode } from 'react'

// Chuyển từ .modal-overlay/.modal-content (statistics.css:174-190) + style inline của index.html.
// Modal luôn được mount (giống DOM gốc), chỉ đổi display + aria-hidden, nên state form được giữ.

type ModalProps = {
  id: string
  open: boolean
  onClose: () => void
  labelledBy: string
  maxWidth: number
  bordered?: boolean
  children: ReactNode
}

export function Modal({ id, open, onClose, labelledBy, maxWidth, bordered = false, children }: ModalProps) {
  const onOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }
  return (
    <div
      id={id}
      className="fixed inset-0 z-9999 items-center justify-center bg-black/60 backdrop-blur-xs"
      style={{ display: open ? 'flex' : 'none' }}
      aria-hidden={open ? 'false' : 'true'}
      onClick={onOverlayClick}
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-5px_rgba(0,0,0,0.2)] ${
          bordered ? 'border border-black/5' : ''
        }`}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  )
}

type ModalHeaderProps = {
  titleId: string
  title: ReactNode
  closeId: string
  onClose: () => void
  small?: boolean
}

export function ModalHeader({ titleId, title, closeId, onClose, small = false }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-linear-to-r from-[#f8fafc] to-[#f1f5f9] px-7 py-5">
      <h3 id={titleId} className={`m-0 font-bold text-text-main ${small ? 'text-[1.1rem]' : 'text-xl'}`}>
        {title}
      </h3>
      <button
        id={closeId}
        type="button"
        className="cursor-pointer border-none bg-transparent p-0 text-text-muted focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Đóng"
        onClick={onClose}
      >
        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  )
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="bg-white p-7">{children}</div>
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-4 border-t border-border bg-[#f8fafc] px-7 py-5 text-right">{children}</div>
  )
}

// Ô nhập trong modal (style inline của index.html)
export const modalLabelClass = 'mb-[0.4rem] block font-semibold text-[#334155]'
export const modalInputClass =
  'w-full rounded-[8px] border border-border px-4 py-3 font-sans text-[0.95rem] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12'
