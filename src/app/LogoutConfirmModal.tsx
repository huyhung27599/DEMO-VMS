import { authActions } from '../shared/auth/authStore'
import { Button } from '../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../shared/ui/Modal'

// #logout-confirm-modal (index.html:326-433) + main.js:222-251.
export function LogoutConfirmModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const onYes = () => {
    onClose()
    void authActions.logout()
  }
  return (
    <Modal id="logout-confirm-modal" open={open} onClose={onClose} labelledBy="logout-confirm-title" maxWidth={420} bordered>
      <ModalHeader
        titleId="logout-confirm-title"
        title="Xác nhận đăng xuất"
        closeId="btn-close-logout-confirm"
        onClose={onClose}
        small
      />
      <ModalBody>
        <div className="mb-5 font-semibold text-[#334155]">Bạn có muốn thoát khỏi hệ thống không?</div>
      </ModalBody>
      <ModalFooter>
        <Button id="logout-confirm-no" variant="outline" size="modal" onClick={onClose}>
          Hủy
        </Button>
        <Button
          id="logout-confirm-yes"
          variant="danger"
          size="modalWide"
          onClick={onYes}
        >
          Đăng xuất
        </Button>
      </ModalFooter>
    </Modal>
  )
}
