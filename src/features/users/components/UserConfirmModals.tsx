import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../shared/ui/Modal'
import { initials } from '../lib'
import type { MockUser } from '../mockData'

type BaseProps = {
  open: boolean
  user: MockUser | null
  onClose: () => void
}

export function ConfirmDeactivateModal({ open, user, onClose, onConfirm }: BaseProps & { onConfirm: () => void }) {
  return (
    <Modal id="user-deactivate-modal" open={open} onClose={onClose} labelledBy="user-deactivate-title" maxWidth={440}>
      <ModalHeader titleId="user-deactivate-title" title="Vô hiệu hóa tài khoản" closeId="btn-close-deactivate" onClose={onClose} />
      <ModalBody>
        <p className="m-0 text-[0.95rem] text-text-main">
          Bạn có chắc muốn vô hiệu hóa tài khoản{' '}
          <strong>{user?.fullName}</strong> (<span className="text-text-muted">{user?.username}</span>)?
        </p>
        <p className="mt-2 mb-0 text-sm text-text-muted">Người dùng sẽ không thể đăng nhập; các phiên đang mở sẽ bị thu hồi.</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="danger" size="modalWide" onClick={onConfirm}>
          Vô hiệu hóa
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function ConfirmDeleteModal({ open, user, onClose, onConfirm }: BaseProps & { onConfirm: () => void }) {
  return (
    <Modal id="user-delete-modal" open={open} onClose={onClose} labelledBy="user-delete-title" maxWidth={440} bordered>
      <ModalHeader titleId="user-delete-title" title="Xóa người dùng" closeId="btn-close-delete-user" onClose={onClose} />
      <ModalBody>
        <p className="m-0 text-[0.95rem] text-text-main">
          Xóa tài khoản <strong>{user?.fullName}</strong>? Hành động không thể hoàn tác trên UI demo.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="danger" size="modalWide" onClick={onConfirm}>
          Xóa
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function ResetPasswordModal({ open, user, onClose, onConfirm }: BaseProps & { onConfirm: () => void }) {
  return (
    <Modal id="user-reset-password-modal" open={open} onClose={onClose} labelledBy="user-reset-title" maxWidth={460}>
      <ModalHeader titleId="user-reset-title" title="Đặt lại mật khẩu" closeId="btn-close-reset-user" onClose={onClose} />
      <ModalBody>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-sm font-bold text-danger">
              {initials(user.fullName)}
            </div>
            <div>
              <div className="font-semibold text-text-main">{user.fullName}</div>
              <div className="text-sm text-text-muted">{user.email}</div>
            </div>
          </div>
        ) : null}
        <p className="mt-4 mb-0 text-sm text-text-muted">
          Hệ thống sẽ gửi liên kết đặt lại mật khẩu tới email đã đăng ký (UI demo — không gửi email thật).
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" size="modalWide" onClick={onConfirm}>
          Gửi liên kết
        </Button>
      </ModalFooter>
    </Modal>
  )
}
