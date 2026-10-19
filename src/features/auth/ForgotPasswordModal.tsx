import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader, modalInputClass, modalLabelClass } from '../../shared/ui/Modal'
import { showToast } from '../../shared/ui/toastStore'
import { errorMessage, useForgotPasswordMutation } from './mutations'
import { firstError, forgotPasswordSchema } from './schemas'

type ForgotPasswordModalProps = {
  open: boolean
  onClose: () => void
  /** auth.js:383-384 — đọc ô #username của form đăng nhập (đã trim ở đây) */
  getUsername: () => string
  /** auth.js:419-420 — đọc checkbox #remember-me lúc gửi */
  getRememberMe: () => boolean
}

// Port của handleForgotPasswordSubmit (auth.js:359-447).
// LƯU Ý: index.html gốc KHÔNG có #forgot-password-modal nên ở bản gốc modal này không bao giờ
// hiện (link .forgot-pwd chỉ mở #reset-request-modal). Component được port + test nhưng
// KHÔNG được mount ở LoginScreen để giữ đúng hành vi (xem MIGRATION_NOTES).
export function ForgotPasswordModal({ open, onClose, getUsername, getRememberMe }: ForgotPasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const mutation = useForgotPasswordMutation()

  const clearForgotPasswordForm = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const username = getUsername().trim()
    const err = firstError(forgotPasswordSchema, { username, oldPassword, newPassword, confirmPassword })
    if (err) {
      setError(err)
      return
    }
    setError('')
    mutation.mutate(
      { username, oldPassword, newPassword, rememberMe: getRememberMe() },
      {
        onSuccess: () => {
          onClose()
          clearForgotPasswordForm()
          showToast('Đổi mật khẩu thành công', 'success')
        },
        onError: (err) => setError(errorMessage(err, 'Đổi mật khẩu thất bại.')),
      },
    )
  }

  return (
    <Modal id="forgot-password-modal" open={open} onClose={onClose} labelledBy="forgot-password-title" maxWidth={520}>
      <ModalHeader
        titleId="forgot-password-title"
        title="Đổi mật khẩu"
        closeId="btn-close-forgot-password"
        onClose={onClose}
      />
      <ModalBody>
        <form id="forgot-password-form" autoComplete="off" onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="old-password" className={modalLabelClass}>
              Mật khẩu cũ
            </label>
            <input
              type="password"
              id="old-password"
              required
              className={modalInputClass}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="new-password" className={modalLabelClass}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              id="new-password"
              required
              className={modalInputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="confirm-new-password" className={modalLabelClass}>
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              id="confirm-new-password"
              required
              className={modalInputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div id="forgot-password-error" className="mt-3 mb-4 min-h-5 text-sm text-danger">
            {error}
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button id="btn-cancel-forgot-password" variant="outline" size="modal" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          id="btn-submit-forgot-password"
          type="submit"
          form="forgot-password-form"
          variant="primary"
          size="modalWide"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Đang đổi…' : 'Đổi mật khẩu'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
