import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../../shared/ui/Modal'
import type { MockUnit } from '../mockData'

type BaseProps = {
  open: boolean
  unit: MockUnit | null
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDeactivateUnitModal({ open, unit, onClose, onConfirm }: BaseProps) {
  return (
    <Modal id="unit-deactivate-modal" open={open} onClose={onClose} labelledBy="unit-deactivate-title" maxWidth={460}>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800">
            <i className="fa-solid fa-lock" aria-hidden="true" />
          </div>
          <div>
            <h3 id="unit-deactivate-title" className="m-0 text-lg font-bold text-text-main">
              Vô hiệu hóa đơn vị?
            </h3>
            <p className="mt-2 mb-0 text-[0.95rem] leading-relaxed text-[#475569]">
              Đơn vị <strong className="text-text-main">{unit?.name}</strong> sẽ bị ẩn khỏi danh mục chọn mới. Dữ liệu
              và các liên kết hiện có vẫn được giữ nguyên, có thể kích hoạt lại sau.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={onClose}>
          Hủy
        </Button>
        <Button
          variant="default"
          size="modalWide"
          className="bg-[#ea580c]! text-white! enabled:hover:bg-[#c2410c]!"
          onClick={onConfirm}
        >
          Vô hiệu hóa
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function ConfirmDeleteUnitModal({ open, unit, onClose, onConfirm }: BaseProps) {
  return (
    <Modal id="unit-delete-modal" open={open} onClose={onClose} labelledBy="unit-delete-title" maxWidth={480}>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-danger">
            <i className="fa-solid fa-trash" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="unit-delete-title" className="m-0 text-lg font-bold text-text-main">
              Xóa đơn vị?
            </h3>
            <p className="mt-2 mb-0 text-[0.95rem] leading-relaxed text-[#475569]">
              Đơn vị <strong className="text-text-main">{unit?.name}</strong> sẽ bị xóa khỏi hệ thống. Hành động này
              không thể hoàn tác.
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                Chỉ xóa được khi đơn vị không còn đơn vị con và không còn người dùng/phương tiện/thiết bị gắn vào.
              </span>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="danger" size="modalWide" onClick={onConfirm}>
          Xóa đơn vị
        </Button>
      </ModalFooter>
    </Modal>
  )
}
