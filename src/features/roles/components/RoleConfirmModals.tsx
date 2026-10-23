import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../../shared/ui/Modal'
import type { Role } from '../types'

type Props = {
  open: boolean
  role: Role | null
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDeleteRoleModal({ open, role, onClose, onConfirm }: Props) {
  return (
    <Modal id="role-delete-modal" open={open} onClose={onClose} labelledBy="role-delete-title" maxWidth={480}>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-danger">
            <i className="fa-solid fa-trash" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="role-delete-title" className="m-0 text-lg font-bold text-text-main">
              Xóa vai trò?
            </h3>
            <p className="mt-2 mb-0 text-[0.95rem] leading-relaxed text-[#475569]">
              Vai trò <strong className="text-text-main">{role?.name}</strong> sẽ bị xóa khỏi hệ thống. Hành động này
              không thể hoàn tác.
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                Chỉ xóa được khi vai trò không còn gán cho người dùng nào. Vai trò hệ thống mặc định không thể xóa.
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
          Xóa vai trò
        </Button>
      </ModalFooter>
    </Modal>
  )
}
