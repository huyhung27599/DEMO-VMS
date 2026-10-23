import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../../shared/ui/Modal'
import type { Device } from '../types'

type Props = {
  open: boolean
  device: Device | null
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDeleteDeviceModal({ open, device, onClose, onConfirm }: Props) {
  return (
    <Modal id="device-delete-modal" open={open} onClose={onClose} labelledBy="device-delete-title" maxWidth={480}>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-danger">
            <i className="fa-solid fa-trash" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="device-delete-title" className="m-0 text-lg font-bold text-text-main">
              Xóa thiết bị?
            </h3>
            <p className="mt-2 mb-0 text-[0.95rem] leading-relaxed text-[#475569]">
              Thiết bị <strong className="text-text-main">{device?.serial}</strong>
              {device?.vehiclePlate ? (
                <>
                  {' '}
                  (xe <strong className="text-text-main">{device.vehiclePlate}</strong>)
                </>
              ) : null}{' '}
              sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                Nên gỡ thiết bị khỏi phương tiện trước khi xóa. Dữ liệu lịch sử liên quan có thể không còn truy cập
                được từ danh mục thiết bị.
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
          Xóa thiết bị
        </Button>
      </ModalFooter>
    </Modal>
  )
}
