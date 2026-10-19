import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../../shared/ui/Modal'

type DeleteVehicleModalProps = {
  open: boolean
  plate: string
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

// index.html:1670-1688 (modal xác nhận riêng của vehicle, không dùng modal xóa chung)
export function DeleteVehicleModal({ open, plate, deleting, onClose, onConfirm }: DeleteVehicleModalProps) {
  return (
    <Modal
      id="delete-vehicle-confirm-modal"
      open={open}
      onClose={onClose}
      labelledBy="delete-vehicle-confirm-title"
      maxWidth={420}
      bordered
    >
      <div className="flex items-center justify-between border-b border-[#fecaca] bg-linear-to-r from-[#fff5f5] to-[#fee2e2] px-7 py-5">
        <h3
          id="delete-vehicle-confirm-title"
          className="m-0 flex items-center gap-2 text-[1.1rem] font-bold text-[#991b1b]"
        >
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Xác nhận xóa phương tiện
        </h3>
        <button
          type="button"
          id="btn-close-delete-vehicle-confirm"
          aria-label="Đóng"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] focus-visible:outline-2 focus-visible:outline-primary"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <ModalBody>
        <p className="m-0 mb-2 font-semibold text-[#334155]">
          Bạn có chắc muốn xóa xe{' '}
          <span id="delete-vehicle-confirm-name" className="text-[#dc2626]">
            {'"' + plate + '"'}
          </span>
          ?
        </p>
        <p className="m-0 text-[0.88rem] text-[#64748b]">Hành động này không thể hoàn tác.</p>
      </ModalBody>
      <ModalFooter>
        <Button
          id="delete-vehicle-confirm-no"
          variant="outline"
          size="modal"
          className="font-semibold"
          onClick={onClose}
        >
          Hủy
        </Button>
        <Button
          id="delete-vehicle-confirm-yes"
          variant="danger"
          size="modalWide"
          className="font-semibold"
          disabled={deleting}
          onClick={onConfirm}
        >
          {deleting ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang xóa...
            </>
          ) : (
            <>
              <i className="fa-solid fa-trash" aria-hidden="true"></i> Xóa xe
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
