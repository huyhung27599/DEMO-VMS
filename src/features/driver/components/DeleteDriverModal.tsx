import { useEffect } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../../shared/ui/Modal'
import { answerDeleteDriverConfirm, useDriverStore } from '../store'

// index.html:438-555 (#delete-driver-confirm-modal) + driver.js:1047-1072 showDeleteDriverConfirm:
// Có / Không / nút X / click nền / phím Esc.
const onNo = () => answerDeleteDriverConfirm(false)

export function DeleteDriverModal() {
  const { open, name } = useDriverStore((s) => s.deleteConfirm)

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onNo()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open])

  return (
    <Modal
      id="delete-driver-confirm-modal"
      open={open}
      onClose={onNo}
      labelledBy="delete-driver-confirm-title"
      maxWidth={420}
      bordered
    >
      <div className="flex items-center justify-between border-b border-[#fecaca] bg-linear-to-r from-[#fff5f5] to-[#fee2e2] px-7 py-5">
        <h3 id="delete-driver-confirm-title" className="m-0 flex items-center gap-2 text-[1.1rem] font-bold text-[#991b1b]">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Xác nhận xóa tài xế
        </h3>
        <button
          type="button"
          id="btn-close-delete-driver-confirm"
          aria-label="Đóng"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] focus-visible:outline-2 focus-visible:outline-primary"
          onClick={onNo}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <ModalBody>
        <p className="m-0 mb-2 font-semibold text-[#334155]">
          Bạn có chắc muốn xóa tài xế{' '}
          <span id="delete-driver-confirm-name" className="text-[#dc2626]">
            {'"' + name + '"'}
          </span>{' '}
          không?
        </p>
        <p className="m-0 text-[0.88rem] text-[#64748b]">Hành động này không thể hoàn tác.</p>
      </ModalBody>
      <ModalFooter>
        <Button id="delete-driver-confirm-no" variant="outline" size="modal" className="font-semibold" onClick={onNo}>
          Hủy
        </Button>
        <Button
          id="delete-driver-confirm-yes"
          variant="danger"
          size="modalWide"
          className="font-semibold shadow-[0_4px_6px_-1px_rgba(201,32,56,0.2)]"
          onClick={() => answerDeleteDriverConfirm(true)}
        >
          <i className="fa-solid fa-trash" aria-hidden="true"></i> Xóa tài xế
        </Button>
      </ModalFooter>
    </Modal>
  )
}
