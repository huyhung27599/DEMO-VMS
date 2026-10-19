import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader, modalInputClass, modalLabelClass } from '../../shared/ui/Modal'
import { errorMessage, useChangePasswordMutation } from './mutations'
import { changePasswordSchema, firstError } from './schemas'
import { closeChangePasswordModal, useChangePasswordModalStore } from './store'

// #change-password-modal (index.html:240-326, auth.js:286-357).
// Luôn mount ở RootLayout (ngoài app shell, giống DOM gốc); mở lại không xóa form.
export function ChangePasswordModal() {
  const open = useChangePasswordModalStore((s) => s.open)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const mutation = useChangePasswordMutation()

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const err = firstError(changePasswordSchema, { oldPassword, newPassword, confirmPassword })
    if (err) {
      setError(err)
      return
    }
    setError('')
    mutation.mutate(
      { oldPassword, newPassword },
      { onError: (err) => setError(errorMessage(err, 'Đổi mật khẩu thất bại.')) },
    )
  }

  return (
    <Modal
      id="change-password-modal"
      open={open}
      onClose={closeChangePasswordModal}
      labelledBy="change-password-title"
      maxWidth={520}
    >
      <ModalHeader
        titleId="change-password-title"
        title="Đổi mật khẩu"
        closeId="btn-close-change-password"
        onClose={closeChangePasswordModal}
      />
      <ModalBody>
        <form id="change-password-form" autoComplete="off" onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="cp-old-password" className={modalLabelClass}>
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              id="cp-old-password"
              name="oldPassword"
              required
              className={modalInputClass}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="cp-new-password" className={modalLabelClass}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              id="cp-new-password"
              name="newPassword"
              required
              className={modalInputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">
              Tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
            </p>
          </div>
          <div className="mb-3">
            <label htmlFor="cp-confirm-password" className={modalLabelClass}>
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              id="cp-confirm-password"
              name="confirmPassword"
              required
              className={modalInputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div id="change-password-error" className="mt-3 mb-4 min-h-5 text-sm text-danger">
            {error}
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button id="btn-cancel-change-password" variant="outline" size="modal" onClick={closeChangePasswordModal}>
          Hủy bỏ
        </Button>
        <Button
          id="btn-submit-change-password"
          type="submit"
          form="change-password-form"
          variant="primary"
          size="modalWide"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Đang đổi…' : 'Cập nhật mật khẩu'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
